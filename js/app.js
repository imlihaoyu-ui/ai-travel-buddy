// ==================== APP STATE ====================
let currentTripData = null;
let map = null;
let routeLayer = null;
let markers = [];
let activeItem = null;

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    const page = document.getElementById(pageId);
    page.style.display = 'flex';
    requestAnimationFrame(() => page.classList.add('active'));
}

// ==================== LANDING PAGE ====================
document.getElementById('generate-btn').addEventListener('click', startGeneration);

// Chip selection (single-select per group)
document.querySelectorAll('.option-chips').forEach(group => {
    group.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            // Single select within group
            group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });
});

// Extra options toggle
document.getElementById('extra-toggle').addEventListener('click', () => {
    const toggle = document.getElementById('extra-toggle');
    const extra = document.getElementById('extra-options');
    toggle.classList.toggle('open');
    extra.classList.toggle('show');
    toggle.querySelector('span').textContent = extra.classList.contains('show')
        ? '▴ 收起更多偏好'
        : '▾ 更多偏好（可选）';
});

document.getElementById('trip-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        startGeneration();
    }
});

// ==================== COLLECT STRUCTURED INPUT ====================
function collectInput() {
    const destination = document.getElementById('trip-input').value.trim();
    if (!destination) return null;

    // Collect selected chips
    const selections = {};
    document.querySelectorAll('.option-chips').forEach(group => {
        const field = group.dataset.field;
        const selected = group.querySelector('.chip.selected');
        if (selected) selections[field] = selected.dataset.value;
    });

    // Collect text inputs
    const departureCity = document.getElementById('departure-city')?.value.trim() || '';
    const specialNeeds = document.getElementById('special-needs')?.value.trim() || '';

    // Build structured prompt
    let prompt = `目的地：${destination}`;
    if (selections.days) prompt += `\n天数：${selections.days}`;
    if (selections.mode) prompt += `\n出行方式：${selections.mode}`;
    if (selections.companion) prompt += `\n同行人：${selections.companion}`;
    if (selections.budget) prompt += `\n住宿预算：${selections.budget}`;
    if (departureCity) prompt += `\n出发城市：${departureCity}`;
    if (selections.style) prompt += `\n旅行风格：${selections.style}`;
    if (specialNeeds) prompt += `\n特殊需求：${specialNeeds}`;

    return prompt;
}

// ==================== GENERATE TRIP ====================
async function startGeneration() {
    const input = collectInput();
    if (!input) {
        alert('请输入你想去的目的地');
        return;
    }

    showPage('loading-page');
    resetLoadingSteps();

    try {
        // Check API health first
        const healthRes = await fetch('/api/health');
        const health = await healthRes.json();
        if (!health.apiKeyConfigured) {
            throw new Error('请先在 .env 文件中配置 DEEPSEEK_API_KEY');
        }

        // Start loading animation
        const loadingPromise = animateLoadingReal();

        // Call AI API
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || '生成失败');
        }

        currentTripData = result.data;

        // Wait for loading animation to finish at least the minimum
        await loadingPromise;

        // Show canvas
        showPage('canvas-page');
        initCanvas();

    } catch (error) {
        console.error('Generate error:', error);
        alert('生成失败：' + error.message);
        showPage('landing-page');
    }
}

// ==================== LOADING ANIMATION ====================
function resetLoadingSteps() {
    ['step1', 'step2', 'step3', 'step4'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('active', 'done');
        // Reset text
        const texts = {
            step1: '🗺️ 正在规划最优路线...',
            step2: '🏨 正在匹配沿途酒店...',
            step3: '⭐ 正在分析用户评价...',
            step4: '✨ 正在生成个性化方案...'
        };
        el.textContent = texts[id];
    });
    document.querySelector('.progress-fill').style.width = '0%';
}

function animateLoadingReal() {
    return new Promise((resolve) => {
        const steps = ['step1', 'step2', 'step3', 'step4'];
        const progressFill = document.querySelector('.progress-fill');
        let current = 0;

        const interval = setInterval(() => {
            if (current > 0) {
                const prev = document.getElementById(steps[current - 1]);
                prev.classList.remove('active');
                prev.classList.add('done');
                prev.textContent = '✓ ' + prev.textContent.slice(2);
            }

            if (current < steps.length) {
                document.getElementById(steps[current]).classList.add('active');
                progressFill.style.width = ((current + 1) / steps.length * 100) + '%';
                current++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, 1200);
    });
}

// ==================== CANVAS INITIALIZATION ====================
function initCanvas() {
    updateHeader();
    initMap();
    renderTimeline();
}

function updateHeader() {
    if (!currentTripData) return;

    const data = currentTripData;
    document.querySelector('.trip-title').textContent = data.title;

    // Calculate stats
    const totalDays = data.days.length;
    const totalNights = data.days.filter(d => d.hotel).length;
    const uniqueHotels = new Set(data.days.filter(d => d.hotel).map(d => d.hotel.name)).size;
    const totalAttractions = data.days.reduce((sum, d) => {
        if (d.schedule) return sum + d.schedule.filter(s => s.type === 'attraction').length;
        return sum + (d.attractions?.length || 0);
    }, 0);
    const hotelTotal = data.days.reduce((sum, d) => sum + (d.hotel?.price || 0), 0);

    // Calculate ticket total
    let ticketTotal = 0;
    data.days.forEach(d => {
        const items = d.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction' && item.data?.ticketPrice) {
                ticketTotal += parseInt(item.data.ticketPrice) || 0;
            }
        });
    });

    // Calculate transport total (estimate based on commute costs)
    let transportTotal = 0;
    data.days.forEach(d => {
        const items = d.schedule || [];
        items.forEach(item => {
            if (item.type === 'commute' && item.cost) {
                const match = item.cost.match(/\d+/);
                if (match) transportTotal += parseInt(match[0]) || 0;
            }
        });
    });

    const grandTotal = hotelTotal + ticketTotal + transportTotal;

    document.querySelector('.trip-summary-bar').innerHTML = `
        <span class="summary-item">📅 ${totalDays}天${totalNights}晚</span>
        <span class="summary-item">🏨 ${uniqueHotels}家酒店</span>
        <span class="summary-item">📍 ${totalAttractions}个景点</span>
        <span class="summary-item budget-item" title="住宿¥${hotelTotal.toLocaleString()} + 门票¥${ticketTotal.toLocaleString()} + 交通¥${transportTotal.toLocaleString()}">
            💰 总预算 ¥${grandTotal.toLocaleString()}
        </span>
    `;

    // Update right meta
    document.querySelector('.trip-meta').innerHTML = `
        <span>📅 ${data.dateRange || '待定'}</span>
        <span>🚗 ${data.mode || '自由行'}</span>
        <span>👤 ${data.travelers || '2人'}</span>
    `;
}

// ==================== MAP ====================
const DAY_COLORS = ['#4285F4','#34A853','#FBBC05','#EA4335','#8E24AA','#00ACC1','#FF7043','#5C6BC0','#26A69A','#FFA726'];
let dayLayers = []; // store per-day route layers for highlight
let isChinaMap = false; // 是否使用高德中文地图
let activeDay = null; // 当前高亮的天（null = 默认 D1 高亮）
let dayNodeMarkers = []; // 图钉
let dayLinkLines = []; // 线段（含箭头、交通图标）
let dayLabelMarkers = []; // D 标签

// WGS84 → GCJ02 坐标转换（高德/百度坐标系）
function wgs84ToGcj02(lng, lat) {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    function transformLat(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    function transformLng(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }

    const dLat = transformLat(lng - 105.0, lat - 35.0);
    const dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const dLatFinal = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    const dLngFinal = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return [lng + dLngFinal, lat + dLatFinal];
}

function isInChina(lat, lng) {
    return lng >= 72.0 && lng <= 136.0 && lat >= 17.0 && lat <= 54.0;
}

// 将 Leaflet 坐标 [lat, lng] 转换为当前地图坐标系
function toMapCoord(coord) {
    if (!coord || coord.length !== 2) return coord;
    if (isChinaMap) {
        const [lng, lat] = wgs84ToGcj02(coord[1], coord[0]);
        return [lat, lng];
    }
    return coord;
}

async function initMap() {
    if (map) { map.remove(); map = null; }
    markers = [];
    dayLayers = [];
    dayNodeMarkers = [];
    dayLinkLines = [];
    dayLabelMarkers = [];

    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([35, 105], 4);

    // 判断行程是否在中国境内，决定用中文高德地图还是英文地图
    let centerLat = 35, centerLng = 105;
    if (currentTripData) {
        const sampleCoords = [];
        currentTripData.days.forEach(day => {
            const items = day.schedule || [];
            items.forEach(item => {
                if (item.type === 'attraction' && item.data?.coords?.length === 2) sampleCoords.push(item.data.coords);
            });
            if (day.hotel?.coords?.length === 2) sampleCoords.push(day.hotel.coords);
        });
        if (sampleCoords.length > 0) {
            centerLat = sampleCoords.reduce((s, c) => s + c[0], 0) / sampleCoords.length;
            centerLng = sampleCoords.reduce((s, c) => s + c[1], 0) / sampleCoords.length;
        }
    }
    isChinaMap = isInChina(centerLat, centerLng);

    if (isChinaMap) {
        // 高德地图（中文标注，GCJ-02 坐标系）
        const amapLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
            maxZoom: 18, subdomains: '1234'
        });
        amapLayer.addTo(map);
        console.log('[Map] 使用高德中文地图');
    } else {
        // 国外：CartoDB Voyager（英文，简洁明亮），失败回退 OSM
        const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19, subdomains: 'abcd'
        });
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, subdomains: 'abc', className: 'osm-bright'
        });
        let voyagerFailed = false;
        voyagerLayer.on('tileerror', () => {
            if (!voyagerFailed) { voyagerFailed = true; map.removeLayer(voyagerLayer); osmLayer.addTo(map); }
        });
        voyagerLayer.addTo(map);
        console.log('[Map] 使用英文地图');
    }

    L.control.zoom({ position: 'topright' }).addTo(map);

    if (!currentTripData) return;

    activeDay = null;
    dayNodeMarkers = [];  // 存所有图钉 { day, marker }
    dayLinkLines = [];    // 存所有线段 { day, line, arrows[], iconMarker }
    dayLabelMarkers = []; // 存 D 标签 { day, marker }

    // 1. 提取所有图钉（景点+酒店）和线段（天内+天间）
    const allPins = [];     // { day, name, coords, type }
    const allSegments = []; // { day, from, to, icon, isFlight, isWalk }

    currentTripData.days.forEach((day) => {
        const dayPins = [];
        const items = day.schedule || [];

        items.forEach(item => {
            if (item.type === 'attraction' && item.data?.coords?.length === 2) {
                dayPins.push({ day: day.day, name: item.data.name, coords: item.data.coords, type: 'attraction' });
            }
        });
        if (day.hotel?.coords?.length === 2) {
            dayPins.push({ day: day.day, name: day.hotel.name, coords: day.hotel.coords, type: 'hotel' });
        }

        allPins.push(...dayPins);

        // 当天内线段
        for (let i = 0; i < dayPins.length - 1; i++) {
            let icon = '🚗', isFlight = false, isWalk = false;
            const fromName = dayPins[i].name;
            for (let j = 0; j < items.length - 1; j++) {
                const cur = items[j], next = items[j + 1];
                if (cur.type === 'attraction' && next.type === 'commute' && cur.data?.name === fromName) {
                    icon = next.icon || getIconByMode(next.mode);
                    isFlight = /飞机|✈️|航班/.test(next.mode || '');
                    isWalk = /步行|走路/.test(next.mode || '');
                    break;
                }
            }
            allSegments.push({
                day: day.day,
                from: dayPins[i].coords,
                to: dayPins[i + 1].coords,
                icon, isFlight, isWalk
            });
        }
    });

    // 天间线段
    for (let i = 0; i < currentTripData.days.length - 1; i++) {
        const todayPins = allPins.filter(p => p.day === currentTripData.days[i].day);
        const tomorrowPins = allPins.filter(p => p.day === currentTripData.days[i + 1].day);
        if (todayPins.length && tomorrowPins.length) {
            const from = todayPins[todayPins.length - 1];
            const to = tomorrowPins[0];
            let icon = '🚗', isFlight = false, isWalk = false;
            const tomorrowItems = currentTripData.days[i + 1].schedule || [];
            const transportItem = tomorrowItems.find(s => s.type === 'transport' && s.data);
            if (transportItem) {
                icon = getIconByMode(transportItem.data.mode);
                isFlight = /飞机|✈️|航班/.test(transportItem.data.mode || '');
            }
            allSegments.push({
                day: currentTripData.days[i].day,
                from: from.coords, to: to.coords,
                icon, isFlight, isWalk
            });
        }
    }

    // 2. 异步获取每段真实路线（自驾/步行用 OSRM，飞机/火车用弧线）
    await Promise.all(allSegments.map(async (seg) => {
        if (seg.isFlight) {
            seg.routeCoords = generateArcCoords(seg.from, seg.to); // 用原始 WGS84
        } else if (seg.isWalk || seg.icon === '🚶') {
            const route = await fetchOSRMRoute(seg.from, seg.to, 'foot');
            seg.routeCoords = route || [seg.from, seg.to];
        } else {
            const route = await fetchOSRMRoute(seg.from, seg.to, 'driving');
            seg.routeCoords = route || [seg.from, seg.to];
        }
    }));

    // 3. 绘制图钉（简洁 icon：景点=📍，酒店=🏨）
    allPins.forEach(pin => {
        const coord = toMapCoord(pin.coords);
        const isHotel = pin.type === 'hotel';
        const pinMarker = L.marker(coord, {
            zIndexOffset: 100, // 低于 D 标签
            icon: L.divIcon({
                className: 'map-pin',
                html: `<div style="
                    width: 28px;
                    height: 28px;
                    background: white;
                    border: 2.5px solid ${isHotel ? '#10b981' : '#2563eb'};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${isHotel ? '14px' : '12px'};
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    font-family: Inter, sans-serif;
                ">${isHotel ? '🏨' : '📍'}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        }).addTo(map);
        pinMarker.bindTooltip(`D${pin.day} · ${pin.name}`, { direction: 'top', offset: [0, -14], className: 'map-tooltip' });
        // 点击图钉：高亮当天 + 滚动卡片
        pinMarker.on('click', () => {
            highlightDay(pin.day);
            scrollToDay(pin.day);
        });
        dayNodeMarkers.push({ day: pin.day, marker: pinMarker, coord });
    });

    // 4. 绘制线段（水管样式：粗线 + 密集箭头）+ 交通图标
    allSegments.forEach((seg) => {
        const routeCoords = (seg.routeCoords || [seg.from, seg.to]).map(toMapCoord);
        const color = '#2563eb';

        // 水管粗线（去掉箭头，改用交通图标指示方向）
        const line = L.polyline(routeCoords, {
            color: color,
            weight: 5,
            opacity: 0.75,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(map);

        // 交通方式图标（线段中点，挨着路线）
        const midIdx = Math.floor(routeCoords.length / 2);
        const midPt = routeCoords[midIdx];
        const iconMarker = L.marker(midPt, {
            icon: L.divIcon({
                className: 'transport-icon',
                html: `<div style="
                    width: 26px;
                    height: 26px;
                    background: white;
                    border: 2px solid ${color};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                ">${seg.icon || '🚗'}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            })
        }).addTo(map);

        // 点击线路：高亮当天 + 滚动卡片
        line.on('click', () => {
            highlightDay(seg.day);
            scrollToDay(seg.day);
        });

        dayLinkLines.push({ day: seg.day, line, arrows: [], iconMarker });
    });

    // 5. 绘制 D 标签（默认只显示 D1，最高层级）
    allPins.forEach(pin => {
        if (pin.type !== 'attraction') return;
        const firstAttrOfDay = allPins.find(p => p.day === pin.day && p.type === 'attraction');
        if (firstAttrOfDay !== pin) return;
        const coord = toMapCoord(pin.coords);
        const labelMarker = L.marker([coord[0], coord[1]], {
            zIndexOffset: 1000, // 最高层级，始终在顶层
            icon: L.divIcon({
                className: 'day-label',
                html: `<div style="
                    background: #2563eb;
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    font-family: Inter, sans-serif;
                ">D${pin.day}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map);
        dayLabelMarkers.push({ day: pin.day, marker: labelMarker, coord });
    });

    // 6. 监听缩放：动态处理图标与 D 标签的重叠
    map.on('zoomend', updatePinVisibility);

    // 7. 初始状态：仅 D1 高亮，其余淡；仅 D1 标签显示
    updateDayHighlight();
    updatePinVisibility();
    fitAllDays();

    function fitAllDays() {
        if (allPins.length > 0) {
            map.fitBounds(L.latLngBounds(allPins.map(p => toMapCoord(p.coords))).pad(0.15));
        }
    }
}

// OSRM 真实路线获取（自驾/步行按公路）
async function fetchOSRMRoute(from, to, profile) {
    // from/to 为 [lat, lng]，OSRM 需要 [lng, lat]
    const url = `https://router.project-osrm.org/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await resp.json();
        if (data.code === 'Ok' && data.routes?.length) {
            return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        }
    } catch (e) {
        console.log('[Route] OSRM failed:', e.message);
    }
    return null;
}

// 滚动卡片列表到对应天
function scrollToDay(dayNum) {
    const el = document.getElementById(`day-block-${dayNum}`);
    const container = document.getElementById('timeline-container');
    if (el && container) {
        // 直接滚动时间线容器，避免影响整体页面
        const top = el.offsetTop - container.offsetTop - 16;
        container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 弧线生成（飞机跨越大距离）
function generateArcCoords(from, to) {
    const midLat = (from[0] + to[0]) / 2;
    const midLng = (from[1] + to[1]) / 2;
    // 垂直方向偏移量（按距离比例）
    const dist = Math.sqrt(Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2));
    const offset = dist * 0.25;
    // 垂直方向
    const dx = to[1] - from[1];
    const dy = to[0] - from[0];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ctrlLat = midLat + (dx / len) * offset;
    const ctrlLng = midLng - (dy / len) * offset;

    // 二次贝塞尔
    const coords = [];
    const steps = 30;
    for (let t = 0; t <= 1; t += 1 / steps) {
        const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * ctrlLat + t * t * to[0];
        const lng = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * ctrlLng + t * t * to[1];
        coords.push([lat, lng]);
    }
    return coords;
}

// 沿线密集放方向箭头（水管内箭头样式：白色箭头嵌在蓝色管线上）
function addDirectionArrows(lineCoords, color) {
    const arrows = [];
    // 水管样式：密集箭头（每段约 8-14 个，按路线长度）
    const arrowCount = Math.min(14, Math.max(6, Math.floor(lineCoords.length / 3)));
    for (let i = 1; i <= arrowCount; i++) {
        const idx = Math.floor(lineCoords.length * i / (arrowCount + 1));
        const p1 = lineCoords[Math.max(0, idx - 2)];
        const p2 = lineCoords[Math.min(lineCoords.length - 1, idx + 1)];
        const lat = lineCoords[idx][0];
        const lng = lineCoords[idx][1];
        const angle = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * 180 / Math.PI;
        const arrow = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'route-arrow',
                html: `<div style="
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    transform: rotate(${-angle + 90}deg);
                    text-shadow: 0 1px 2px rgba(0,0,0,0.25);
                    line-height: 1;
                ">▶</div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        }).addTo(map);
        arrows.push(arrow);
    }
    return arrows;
}

// 根据交通方式文本获取图标
function getIconByMode(mode) {
    if (!mode) return '🚗';
    if (/步行|走路/.test(mode)) return '🚶';
    if (/地铁/.test(mode)) return '🚇';
    if (/公交/.test(mode)) return '🚌';
    if (/打车|出租|taxi|的士/i.test(mode)) return '🚕';
    if (/自驾|开车|汽车/.test(mode)) return '🚗';
    if (/高铁|火车|动车/.test(mode)) return '🚄';
    if (/飞机|航班/.test(mode)) return '✈️';
    if (/轮船|渡轮|ferry/i.test(mode)) return '⛴️';
    return '🚗';
}

// 提取地点短名（用于胶囊标签）
function extractPlaceName(title) {
    if (!title) return '';
    // 去掉常见前缀动词
    let name = title.replace(/^(抵达|前往|飞往|出发去|游览|探访|前往|抵达|到达)/, '');
    // 取箭头后面的部分（如 "班夫 → Golden" → "班夫"）
    if (name.includes('→')) name = name.split('→')[0].trim();
    // 去掉其他分隔符
    name = name.replace(/[·、|].*$/, '').trim();
    // 截断到6个字符
    if (name.length > 6) name = name.slice(0, 6);
    return name || '目的地';
}

// 高亮某一天：当天不透明，其他天变淡（不做聚焦，聚焦由调用方决定）
function highlightDay(dayNum) {
    activeDay = dayNum;
    updateDayHighlight();
}

// 更新所有图钉、线段、D标签的透明度
// 规则：默认仅 D1 高亮（其他淡）；选中某天时仅当天高亮（其他淡）
function updateDayHighlight() {
    // 计算"当前应该高亮的天"
    const highlightDayNum = activeDay === null ? 1 : activeDay;

    // 图钉
    dayNodeMarkers.forEach(pin => {
        const el = pin.marker.getElement();
        if (!el) return;
        const opacity = pin.day === highlightDayNum ? 1.0 : 0.25;
        el.style.opacity = opacity;
        el.style.transition = 'opacity 0.3s ease';
    });

    // 线段 + 箭头 + 交通图标
    dayLinkLines.forEach(link => {
        const opacity = link.day === highlightDayNum ? 0.9 : 0.18;
        if (link.line && link.line.setStyle) link.line.setStyle({ opacity });

        (link.arrows || []).forEach(arrow => {
            const el = arrow.getElement();
            if (el) { el.style.opacity = opacity; el.style.transition = 'opacity 0.3s ease'; }
        });

        if (link.iconMarker) {
            const el = link.iconMarker.getElement();
            if (el) { el.style.opacity = link.day === highlightDayNum ? 1.0 : 0.25; el.style.transition = 'opacity 0.3s ease'; }
        }
    });

    // D 标签：只显示高亮的那天的标签
    dayLabelMarkers.forEach(label => {
        const el = label.marker.getElement();
        if (!el) return;
        if (label.day === highlightDayNum) {
            el.style.display = '';
            el.style.opacity = 1;
        } else {
            el.style.display = 'none';
        }
    });
}

// 动态处理图钉与 D 标签的重叠：
// 图钉离当天 D 标签太近（重叠>50%）时隐藏，放大分离后显示
function updatePinVisibility() {
    if (!map) return;
    dayNodeMarkers.forEach(pin => {
        const el = pin.marker.getElement();
        if (!el) return;

        // 找到同一天的 D 标签
        const label = dayLabelMarkers.find(l => l.day === pin.day);
        if (!label) { el.style.display = ''; return; }

        // 计算屏幕像素距离
        const p1 = map.latLngToContainerPoint(pin.coord);
        const p2 = map.latLngToContainerPoint(label.coord);
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        // 重叠阈值：D标签(24px) + pin(28px)，圆心距 < 26px 时重叠面积约 >50%
        const overlapThreshold = 26;
        if (dist < overlapThreshold) {
            // 重叠：隐藏图钉（D 标签在最上层）
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });
}

// Smooth curve between points
function generateSmoothRoute(points) {
    if (points.length < 2) return points;
    if (points.length === 2) {
        // Simple curve between 2 points
        return generateCurve(points[0], points[1], 0);
    }
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        const curve = generateCurve(points[i], points[i + 1], i);
        result.push(...curve);
    }
    result.push(points[points.length - 1]);
    return result;
}

function generateCurve(p1, p2, index) {
    const result = [p1];
    const midLat = (p1[0] + p2[0]) / 2;
    const midLng = (p1[1] + p2[1]) / 2;
    const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
    if (dist < 0.001) return [p1]; // same point

    const dx = p2[1] - p1[1];
    const dy = p2[0] - p1[0];
    const offset = dist * 0.08;
    const dir = index % 2 === 0 ? 1 : -1;
    const ctrlLat = midLat + (dx * offset / dist) * dir;
    const ctrlLng = midLng - (dy * offset / dist) * dir;

    const steps = Math.max(8, Math.floor(dist * 3));
    for (let t = 1 / steps; t < 1; t += 1 / steps) {
        const lat = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * ctrlLat + t * t * p2[0];
        const lng = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * ctrlLng + t * t * p2[1];
        result.push([lat, lng]);
    }
    return result;
}

// 聚焦某一天（按天聚焦，不需要具体坐标）
function focusDay(dayNum) {
    if (!map || !currentTripData) return;
    const day = currentTripData.days.find(d => d.day === dayNum);
    if (!day) return;
    const dayCoords = getDayCoords(day).map(toMapCoord);
    if (dayCoords.length > 1) {
        map.fitBounds(L.latLngBounds(dayCoords).pad(0.3), { maxZoom: 14, duration: 0.6 });
    } else if (dayCoords.length === 1) {
        map.flyTo(dayCoords[0], 14, { duration: 0.6 });
    }
}

// Focus map on specific item with appropriate zoom
function focusMapOn(coords, dayIndex) {
    if (!map || !coords || coords.length !== 2) return;

    // 转换到当前地图坐标系
    const mapCoord = toMapCoord(coords);

    if (dayIndex !== undefined && currentTripData) {
        const day = currentTripData.days.find(d => d.day === dayIndex);
        if (day) {
            const dayCoordsAll = getDayCoords(day).map(toMapCoord);
            if (dayCoordsAll.length > 1) {
                map.fitBounds(L.latLngBounds(dayCoordsAll).pad(0.3), { maxZoom: 14, duration: 0.6 });
                return;
            }
        }
    }
    map.flyTo(mapCoord, 14, { duration: 0.6 });
}

// Helper: get all coords from a day (works with both old and new format)
function getDayCoords(day) {
    const coords = [];
    if (day.schedule) {
        day.schedule.forEach(item => {
            if (item.type === 'attraction' && item.data?.coords?.length === 2) coords.push(item.data.coords);
        });
    }
    if (day.attractions) {
        day.attractions.forEach(a => { if (a.coords?.length === 2) coords.push(a.coords); });
    }
    if (day.hotel?.coords?.length === 2) coords.push(day.hotel.coords);
    return coords;
}

// ==================== TIMELINE RENDERING ====================
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    if (!currentTripData || !currentTripData.days) return;

    currentTripData.days.forEach((day, index) => {
        const block = document.createElement('div');
        block.className = 'day-block';
        block.id = `day-block-${day.day}`;
        block.style.animationDelay = `${index * 0.08}s`;

        let html = `
            <div class="day-header" data-day="${day.day}" style="cursor:pointer;" title="点击查看第${day.day}天行程">
                <div class="day-badge">D${day.day}</div>
                <div class="day-info">
                    <div class="day-date">${day.date} · ${day.title}</div>
                    <div class="day-route">${day.route}${day.driving ? ' · ' + day.driving : ''}</div>
                </div>
            </div>
        `;

        // New schedule-based rendering
        if (day.schedule && day.schedule.length > 0) {
            day.schedule.forEach(item => {
                if (item.type === 'attraction' && item.data) {
                    html += renderAttraction(item.data, day.day, item.startTime);
                } else if (item.type === 'commute') {
                    html += renderCommute(item);
                } else if (item.type === 'transport' && item.data) {
                    html += renderTransport(item.data);
                }
            });
        } else {
            // Fallback: old format with attractions array + transport
            if (day.transport) html += renderTransport(day.transport);
            if (day.attractions) {
                day.attractions.forEach(attr => html += renderAttraction(attr, day.day));
            }
        }

        // Hotel
        if (day.hotel) {
            html += renderHotel(day.hotel, day.day);
        }

        block.innerHTML = html;
        container.appendChild(block);
    });

    bindTimelineEvents();
}

function renderAttraction(attr, dayNum, startTime) {
    const metaItems = [];
    if (startTime) metaItems.push(`🕐 ${startTime}`);
    if (attr.duration) metaItems.push(`⏱ ${attr.duration}`);
    if (attr.ticket) metaItems.push(`🎫 ${attr.ticket}`);

    let detailHtml = '';
    if (attr.highlights && attr.highlights.length > 0) {
        detailHtml += `<div class="detail-row"><span class="label">亮点</span><span>${attr.highlights.join(' · ')}</span></div>`;
    }
    if (attr.needReserve) {
        detailHtml += `<div class="detail-row"><span class="badge-reserve">⚠️ 需预约</span><span>${attr.reserveNote || ''}</span></div>`;
    }

    return `
        <div class="location-node">
            <div class="node-dot attraction"></div>
            <div class="attraction-item" data-id="${attr.id}" data-type="attraction" data-day="${dayNum}">
                <div class="attraction-main">
                    <span class="attraction-name">${attr.icon || '📍'} ${attr.name}</span>
                    <span class="expand-toggle" data-target="${attr.id}-detail">展开 ▾</span>
                </div>
                <div class="attraction-meta">${metaItems.join('<span style="color:#e2e8f0">|</span>')}</div>
                <div class="attraction-detail" id="${attr.id}-detail">
                    ${detailHtml}
                </div>
            </div>
        </div>
    `;
}

function renderHotel(hotel, dayNum) {
    return `
        <div class="location-node">
            <div class="node-dot hotel"></div>
            <div class="hotel-card" data-id="${hotel.id}" data-type="hotel" data-day="${dayNum}">
                <div class="hotel-main">
                    <div class="hotel-name">🏨 ${hotel.name}</div>
                    <div class="hotel-price"><span class="currency">¥</span>${hotel.price}</div>
                </div>
                <div class="hotel-reason">${hotel.reason}</div>
            </div>
        </div>
    `;
}

function renderTransport(transport) {
    if (!transport) return '';
    return `
        <div class="location-node">
            <div class="node-dot transport"></div>
            <div class="transport-card">
                <div class="transport-header">
                    <span class="transport-mode">${transport.mode || '🚗 自驾'}</span>
                    <span class="transport-route">${transport.from || ''} → ${transport.to || ''}</span>
                </div>
                <div class="transport-details">
                    <div class="transport-row">
                        <span class="transport-icon">📏</span>
                        <span>${transport.distance || ''} · ${transport.duration || ''}</span>
                    </div>
                    ${transport.departSuggestion ? `
                    <div class="transport-row highlight">
                        <span class="transport-icon">🕐</span>
                        <span>${transport.departSuggestion}</span>
                    </div>` : ''}
                    ${transport.arriveEstimate ? `
                    <div class="transport-row highlight">
                        <span class="transport-icon">📍</span>
                        <span>${transport.arriveEstimate}</span>
                    </div>` : ''}
                    ${transport.tips ? `
                    <div class="transport-row tips">
                        <span class="transport-icon">💡</span>
                        <span>${transport.tips}</span>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderCommute(commute) {
    if (!commute) return '';
    return `
        <div class="location-node">
            <div class="node-dot commute"></div>
            <div class="commute-card">
                <span class="commute-icon">${commute.icon || '🚶'}</span>
                <span class="commute-mode">${commute.mode || ''}</span>
                <span class="commute-duration">${commute.duration || ''}</span>
                ${commute.cost && commute.cost !== '免费' ? `<span class="commute-cost">${commute.cost}</span>` : ''}
                ${commute.detail ? `<span class="commute-detail">${commute.detail}</span>` : ''}
            </div>
        </div>
    `;
}

// ==================== EVENT BINDING ====================
function bindTimelineEvents() {
    // day-header 点击：地图聚焦 + 高亮当天
    document.querySelectorAll('.day-header').forEach(header => {
        header.addEventListener('click', () => {
            const dayNum = parseInt(header.dataset.day);
            if (dayNum) {
                highlightDay(dayNum);
                focusDay(dayNum);
            }
        });
    });

    document.querySelectorAll('.attraction-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('expand-toggle')) {
                toggleExpand(e.target);
                return;
            }
            setActive(item);
            const id = item.dataset.id;
            const dayNum = parseInt(item.dataset.day);
            const attr = findAttraction(id);
            if (attr) {
                showAttractionDetail(attr);
                highlightDay(dayNum);
                focusMapOn(attr.coords, dayNum);
            }
        });
    });

    document.querySelectorAll('.hotel-card').forEach(card => {
        card.addEventListener('click', () => {
            setActive(card);
            const id = card.dataset.id;
            const dayNum = parseInt(card.dataset.day);
            const hotel = findHotel(id);
            if (hotel) {
                showHotelDetail(hotel);
                highlightDay(dayNum);
                focusMapOn(hotel.coords, dayNum);
            }
        });
    });

    document.querySelectorAll('.expand-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExpand(toggle);
        });
    });

    document.querySelectorAll('.pref-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.pref-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
        });
    });

    document.getElementById('chat-send').addEventListener('click', handleChat);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleChat();
    });

    // Quick chat shortcut buttons
    document.querySelectorAll('.quick-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.dataset.msg;
            if (msg) {
                document.getElementById('chat-input').value = msg;
                handleChat();
            }
        });
    });
}

function toggleExpand(toggle) {
    const targetId = toggle.dataset.target;
    const detail = document.getElementById(targetId);
    if (detail) {
        detail.classList.toggle('expanded');
        toggle.textContent = detail.classList.contains('expanded') ? '收起 ▴' : '展开 ▾';
    }
}

function setActive(element) {
    document.querySelectorAll('.attraction-item.active, .hotel-card.active').forEach(el => {
        el.classList.remove('active');
    });
    element.classList.add('active');
}

// ==================== DETAIL PANEL ====================
function showAttractionDetail(attr) {
    const panel = document.getElementById('detail-panel');

    let reviewsHtml = '';
    if (attr.reviews && attr.reviews.length > 0) {
        reviewsHtml = attr.reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-author">${r.author}</span>
                    <span class="review-rating">${r.rating}</span>
                </div>
                <div class="review-text">${r.text}</div>
            </div>
        `).join('');
    }

    let highlightsHtml = '';
    if (attr.highlights && attr.highlights.length > 0) {
        highlightsHtml = `
            <div class="detail-section">
                <div class="detail-section-title">玩法亮点</div>
                <div class="detail-tags">
                    ${attr.highlights.map(h => `<span class="detail-tag">${h}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Ticket purchase module
    let ticketHtml = '';
    if (attr.ticketOptions && attr.ticketOptions.length > 0) {
        const optionsHtml = attr.ticketOptions.map((opt, i) => `
            <div class="ticket-option ${i === 0 ? 'recommended' : ''}">
                <div class="ticket-option-info">
                    <span class="ticket-type">${opt.type}</span>
                    ${opt.note ? `<span class="ticket-note">${opt.note}</span>` : ''}
                </div>
                <div class="ticket-option-action">
                    <span class="ticket-price">${opt.price}</span>
                    <button class="ticket-buy-btn" onclick="handleTicketBuy('${attr.name}', '${opt.type}')">
                        ${i === 0 ? '立即预订' : '选购'}
                    </button>
                </div>
            </div>
        `).join('');

        ticketHtml = `
            <div class="detail-section ticket-section">
                <div class="detail-section-title">🎫 门票预订</div>
                <div class="ticket-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    // Gradient fallback colors
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    ];
    const gradIdx = Math.abs(attr.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % gradients.length;

    panel.innerHTML = `
        <div class="detail-content">
            <div class="detail-image" id="detail-img" style="background:${gradients[gradIdx]}">
                <div class="detail-image-center">
                    <span class="detail-image-emoji">${attr.icon || '📍'}</span>
                </div>
                <div class="detail-image-name">${attr.name}</div>
            </div>
            <div class="detail-header">
                <div class="detail-type">景点</div>
                <div class="detail-title">${attr.icon || '📍'} ${attr.name}</div>
                <div class="detail-subtitle">${attr.description || ''}</div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">基本信息</div>
                <div class="detail-row"><span class="label">游玩时长</span><span>约 ${attr.duration}</span></div>
                <div class="detail-row"><span class="label">门票</span><span>${attr.ticket}</span></div>
                ${attr.needReserve ? `<div class="detail-row"><span class="badge-reserve">⚠️ 需预约</span><span>${attr.reserveNote || ''}</span></div>` : `<div class="detail-row"><span class="badge-free">✓ 无需预约</span></div>`}
            </div>
            ${highlightsHtml}
            ${ticketHtml}
            ${reviewsHtml ? `
                <div class="detail-section">
                    <div class="detail-section-title">用户评价</div>
                    ${reviewsHtml}
                </div>
            ` : ''}
        </div>
    `;

    // Load real image from Wikipedia
    loadDetailImage(attr.nameEn || attr.name);
}

function showHotelDetail(hotel) {
    const panel = document.getElementById('detail-panel');

    let reviewsHtml = '';
    if (hotel.reviews && hotel.reviews.length > 0) {
        reviewsHtml = hotel.reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-author">${r.author}</span>
                    <span class="review-rating">${r.rating}</span>
                </div>
                <div class="review-text">${r.text}</div>
            </div>
        `).join('');
    }

    let alternativesHtml = '';
    if (hotel.alternatives && hotel.alternatives.length > 0) {
        alternativesHtml = hotel.alternatives.map(alt => `
            <div class="hotel-list-item">
                <div class="hotel-list-name">${alt.name}</div>
                <div class="hotel-list-info">
                    <span>¥${alt.price}/晚</span>
                    <span>${alt.distance}</span>
                </div>
                <div class="hotel-list-reason">${alt.reason}</div>
            </div>
        `).join('');
    }

    const hotelGradient = 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)';

    panel.innerHTML = `
        <div class="detail-content">
            <div class="detail-image" id="detail-img" style="background:${hotelGradient}">
                <div class="detail-image-center">
                    <span class="detail-image-emoji">🏨</span>
                </div>
                <div class="detail-image-name">${hotel.name}</div>
            </div>
            <div class="detail-header">
                <div class="detail-type">推荐住宿</div>
                <div class="detail-title">🏨 ${hotel.name}</div>
                <div class="detail-subtitle">${hotel.reason}</div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">酒店信息</div>
                <div class="detail-row"><span class="label">价格</span><span style="font-weight:700;color:#2563eb">¥${hotel.price}/晚</span></div>
                <div class="detail-row"><span class="label">评分</span><span>⭐ ${hotel.rating}</span></div>
                <div class="detail-tags" style="margin-top:6px">
                    ${(hotel.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('')}
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">为你推荐的理由</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;padding:10px;background:#f0fdf4;border-radius:8px;">
                    💡 ${hotel.reason}
                </div>
            </div>
            ${reviewsHtml ? `
                <div class="detail-section">
                    <div class="detail-section-title">住客评价</div>
                    ${reviewsHtml}
                </div>
            ` : ''}
            ${alternativesHtml ? `
                <div class="detail-section">
                    <div class="detail-section-title">其他选择</div>
                    ${alternativesHtml}
                </div>
            ` : ''}
        </div>
    `;

    // Load real image
    loadDetailImage(hotel.nameEn || hotel.name);
}

// ==================== IMAGE LOADER ====================
const imageStatusCache = {};

async function loadDetailImage(searchName) {
    if (!searchName) return;

    const imgEl = document.getElementById('detail-img');
    if (!imgEl) return;

    const proxyUrl = `/api/image?q=${encodeURIComponent(searchName)}`;

    // Check if we already know this image works or not
    if (imageStatusCache[searchName] === 'ok') {
        applyImage(imgEl, proxyUrl);
        return;
    }
    if (imageStatusCache[searchName] === 'fail') return;

    // Load image via our server proxy
    const img = new Image();
    img.onload = () => {
        imageStatusCache[searchName] = 'ok';
        const currentEl = document.getElementById('detail-img');
        if (currentEl) applyImage(currentEl, proxyUrl);
    };
    img.onerror = () => {
        imageStatusCache[searchName] = 'fail';
    };
    img.src = proxyUrl;
}

function applyImage(el, url) {
    el.style.backgroundImage = `url('${url}')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    const emoji = el.querySelector('.detail-image-emoji');
    if (emoji) emoji.style.display = 'none';
}

// ==================== TICKET PURCHASE ====================
function handleTicketBuy(attractionName, ticketType) {
    // In production, this would link to the OTA's booking page
    // For demo, show a confirmation toast
    const toast = document.createElement('div');
    toast.className = 'purchase-toast';
    toast.innerHTML = `
        <div class="toast-icon">✅</div>
        <div class="toast-text">
            <div class="toast-title">已加入待购清单</div>
            <div class="toast-detail">${attractionName} · ${ticketType}</div>
        </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ==================== DATA HELPERS ====================
function findAttraction(id) {
    if (!currentTripData) return null;
    for (const day of currentTripData.days) {
        // Search in schedule (new format)
        if (day.schedule) {
            for (const item of day.schedule) {
                if (item.type === 'attraction' && item.data?.id === id) return item.data;
            }
        }
        // Fallback: search in attractions (old format)
        if (day.attractions) {
            const found = day.attractions.find(a => a.id === id);
            if (found) return found;
        }
    }
    return null;
}

function findHotel(id) {
    if (!currentTripData) return null;
    for (const day of currentTripData.days) {
        if (day.hotel && day.hotel.id === id) return day.hotel;
    }
    return null;
}

// ==================== CHAT HANDLER ====================
async function handleChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    document.getElementById('chat-send').disabled = true;

    // Show loading state
    const footer = document.querySelector('.timeline-footer');
    const statusEl = document.createElement('div');
    statusEl.className = 'chat-status';
    statusEl.style.cssText = 'font-size:12px;color:#2563eb;margin-top:8px;padding:8px 12px;background:#eff6ff;border-radius:8px;';
    statusEl.textContent = '🔄 正在调整行程方案...';
    footer.appendChild(statusEl);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                currentTripData: currentTripData
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || '调整失败');
        }

        currentTripData = result.data;
        statusEl.style.color = '#10b981';
        statusEl.style.background = '#f0fdf4';
        statusEl.textContent = '✓ 行程已更新！';

        // Re-render everything
        updateHeader();
        initMap();
        renderTimeline();

        setTimeout(() => statusEl.remove(), 3000);
    } catch (error) {
        statusEl.style.color = '#ef4444';
        statusEl.style.background = '#fef2f2';
        statusEl.textContent = '✗ ' + error.message;
        setTimeout(() => statusEl.remove(), 5000);
    } finally {
        input.disabled = false;
        document.getElementById('chat-send').disabled = false;
    }
}

// ==================== SAVE TO PHONE ====================
async function saveTripToPhone() {
    if (!currentTripData) return;

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = '⏱保存中...';

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip: currentTripData })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '保存失败');

        const tripId = result.id;
        const shareUrl = `${window.location.origin}/mobile.html?id=${tripId}`;

        // Show modal
        document.getElementById('save-modal').style.display = 'flex';
        document.getElementById('share-url').value = shareUrl;

        // Generate QR code
        const qrContainer = document.getElementById('qr-container');
        qrContainer.innerHTML = '';

        try {
            const qr = qrcode(0, 'M');
            qr.addData(shareUrl);
            qr.make();
            qrContainer.innerHTML = qr.createImgTag(5, 8);
        } catch (e) {
            // Fallback: show URL as text
            qrContainer.innerHTML = '<div style="padding:20px;text-align:center;word-break:break-all">' + shareUrl + '</div>';
        }

    } catch (error) {
        alert('保存失败：' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '📱 保存到手机';
    }
}

function closeSaveModal() {
    document.getElementById('save-modal').style.display = 'none';
}

function copyShareUrl() {
    const input = document.getElementById('share-url');
    input.select();
    document.execCommand('copy');
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = '✓ 已复制';
    setTimeout(() => btn.textContent = original, 1500);
}

// Make functions globally available
window.closeSaveModal = closeSaveModal;
window.copyShareUrl = copyShareUrl;
window.saveTripToPhone = saveTripToPhone;

// ==================== EXPORT FEATURES ====================

// Generate a printable HTML version that opens in new window
function generatePrintableHTML(trip) {
    if (!trip) return '';
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${trip.title || '行程'}</title>
        <style>
                body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6; }
                h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 12px; }
                .summary { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0; }
                .day { page-break-inside: avoid; margin: 24px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
                .day-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .day-badge { background: #2563eb; color: white; padding: 6px 12px; border-radius: 50%; font-weight: bold; }
                .item { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
                .hotel { background: #f0fdf4; padding: 12px; border-radius: 6px; margin-top: 12px; }
                .time { color: #64748b; font-size: 13px; }
                .transport { background: #fffbeb; padding: 10px; border-radius: 6px; margin: 8px 0; }
                .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
                @media print { .no-print { display: none; } }
            </style></head><body>
        <h1>✈️ ${trip.title || '我的行程'}</h1>
        <div class="summary">
                <strong>${trip.dateRange || ''}</strong> · ${trip.mode || ''} · ${trip.travelers || ''}
                <div style="margin-top:8px;font-size:13px;color:#64748b">由 AI旅行搭子 生成 · ${new Date().toLocaleDateString('zh-CN')}</div>
            </div>`;

    trip.days?.forEach(day => {
        html += `<div class="day">
            <div class="day-header">
                <div class="day-badge">D${day.day}</div>
                <div><strong>${day.title || ''}</strong><br><span class="time">${day.route || ''}${day.driving ? ' · ' + day.driving : ''}</span></div>
            </div>`;

        const items = day.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction' && item.data) {
                html += `<div class="item">
                    <strong>${item.data.icon || '📍'} ${item.data.name}</strong>
                    <div class="time">${item.startTime || ''} · ${item.data.duration || ''} · ${item.data.ticket || ''}</div>
                    ${item.data.description ? `<div style="font-size:13px;color:#64748b;margin-top:4px">${item.data.description}</div>` : ''}
                </div>`;
            } else if (item.type === 'commute') {
                html += `<div style="font-size:12px;color:#94a3b8;padding:4px 0">${item.icon || '🚶'} ${item.mode} · ${item.duration}${item.cost ? ' · ' + item.cost : ''}</div>`;
            } else if (item.type === 'transport' && item.data) {
                html += `<div class="transport">
                    <strong>${item.data.mode || '🚗 自驾'}</strong> · ${item.data.from} → ${item.data.to}<br>
                    <span class="time">${item.data.distance || ''} · ${item.data.duration || ''}</span>
                    ${item.data.departSuggestion ? `<br>${item.data.departSuggestion}` : ''}
                </div>`;
            }
        });

        if (day.hotel) {
            html += `<div class="hotel">
                <strong>🏨 ${day.hotel.name}</strong> · ¥${day.hotel.price}/晚<br>
                <span style="font-size:13px;color:#64748b">${day.hotel.reason || ''}</span>
            </div>`;
        }
        html += `</div>`;
    });

    html += `<div class="footer">由 AI旅行搭子 生成 · 携程创新大赛参赛作品</div>`;
    html += `<div class="no-print" style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:12px 24px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">🖨️ 打印 / 另存为 PDF</button></div>`;
    html += `</body></html>`;
    return html;
}

function exportPDF() {
    if (!currentTripData) return;
    const html = generatePrintableHTML(currentTripData);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    showToast('📄 行程页面已打开，点"打印"可另存为PDF');
}

function exportCalendar() {
    if (!currentTripData) return;
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Travel Buddy//ZH\n';
    let day = 1;
    currentTripData.days?.forEach((d, i) => {
        const dateStr = d.date?.match(/\d+月\d+日?/)?.[0];
        const date = parseTravelDate(dateStr, currentTripData.dateRange);
        if (!date) return;

        const items = d.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction' && item.data) {
                const startTime = parseTime(item.startTime) || '09:00';
                const durationMin = parseDurationMin(item.data.duration);
                const startDate = combineDateTime(date, startTime);
                const endDate = addMinutes(startDate, durationMin);

                ics += `BEGIN:VEVENT\n`;
                ics += `UID:attraction-${day}-${i}@aitravelbuddy\n`;
                ics += `SUMMARY:${item.data.icon || '📍'} ${item.data.name}\n`;
                ics += `DTSTART:${formatICSDate(startDate)}\n`;
                ics += `DTEND:${formatICSDate(endDate)}\n`;
                ics += `DESCRIPTION:${item.data.description || ''}\\n时长:${item.data.duration}\\n门票:${item.data.ticket || ''}\n`;
                ics += `LOCATION:${item.data.coords?.join(',') || ''}\n`;
                ics += `END:VEVENT\n`;
                day++;
            }
        });
    });
    ics += 'END:VCALENDAR\n';

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTripData.title || '行程'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📅 日历文件已下载，双击导入到手机日历');
}

// Calendar helpers
function parseTravelDate(str, rangeStr) {
    if (!str) return null;
    const m = str.match(/(\d+)月(\d+)/);
    if (!m) return null;
    const year = new Date().getFullYear();
    // Try rangeStr to get start month
    let month = parseInt(m[1]);
    if (rangeStr) {
        const rangeMatch = rangeStr.match(/(\d+)\.(\d+)\s*[-~]\s*(\d+)\.(\d+)/);
        if (rangeMatch) {
            const startMonth = parseInt(rangeMatch[2]);
            // Adjust year if needed
            const today = new Date();
            year = today.getFullYear();
        }
    }
    return new Date(year, month - 1, parseInt(m[2]));
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    const m = timeStr.match(/(\d+):(\d+)/);
    return m ? `${m[1]}:${m[2]}` : null;
}

function parseDurationMin(duration) {
    if (!duration) return 90;
    const m = duration.match(/(\d+(?:\.\d+)?)h/);
    if (m) return Math.round(parseFloat(m[1]) * 60);
    const m2 = duration.match(/(\d+)min/);
    if (m2) return parseInt(m2[1]);
    return 90;
}

function combineDateTime(date, time) {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
}

function addMinutes(date, min) {
    return new Date(date.getTime() + min * 60000);
}

function formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'purchase-toast';
    toast.innerHTML = `<div class="toast-icon">💡</div><div class="toast-text"><div class="toast-title">${msg}</div></div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

window.exportPDF = exportPDF;
window.exportCalendar = exportCalendar;
