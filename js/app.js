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
    const totalBudget = data.days.reduce((sum, d) => sum + (d.hotel?.price || 0), 0);

    document.querySelector('.trip-summary-bar').innerHTML = `
        <span class="summary-item">📅 ${totalDays}天${totalNights}晚</span>
        <span class="summary-item">🏨 ${uniqueHotels}家酒店</span>
        <span class="summary-item">📍 ${totalAttractions}个景点</span>
        <span class="summary-item total">💰 住宿预算 ¥${totalBudget.toLocaleString()}</span>
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

function initMap() {
    if (map) { map.remove(); map = null; }
    markers = [];
    dayLayers = [];

    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([35, 105], 4);

    // Bright clean tiles - CartoDB Voyager (Google Maps-like)
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

    L.control.zoom({ position: 'topright' }).addTo(map);

    if (!currentTripData) return;

    const allCoords = [];
    const hotelMarkersAdded = new Set();

    // Draw per-day routes with different colors
    currentTripData.days.forEach((day, index) => {
        const dayCoords = [];

        // Collect coords from schedule (new format) or attractions (old format)
        if (day.schedule) {
            day.schedule.forEach(item => {
                if (item.type === 'attraction' && item.data?.coords?.length === 2) {
                    dayCoords.push(item.data.coords);
                }
            });
        } else if (day.attractions) {
            day.attractions.forEach(attr => {
                if (attr.coords && attr.coords.length === 2) dayCoords.push(attr.coords);
            });
        }
        if (day.hotel?.coords?.length === 2) dayCoords.push(day.hotel.coords);

        if (dayCoords.length === 0) return;
        allCoords.push(...dayCoords);

        const color = DAY_COLORS[index % DAY_COLORS.length];

        // Draw smooth route for this day
        if (dayCoords.length > 1) {
            const smooth = generateSmoothRoute(dayCoords);
            const polyline = L.polyline(smooth, {
                color: color,
                weight: 3.5,
                opacity: 0.8,
                smoothFactor: 2,
                lineJoin: 'round'
            }).addTo(map);
            dayLayers.push({ day: day.day, layer: polyline, color, coords: dayCoords });
        }

        // Day badge marker (at the first attraction = start of day)
        const startCoord = dayCoords[0];
        const marker = L.marker(startCoord, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background: ${color};
                    color: white;
                    border: 2.5px solid white;
                    border-radius: 50%;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    font-family: Inter, sans-serif;
                ">D${day.day}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            })
        }).addTo(map);
        marker.bindTooltip(`D${day.day} 起点 · ${day.title}`, { direction: 'top', offset: [0, -14], className: 'map-tooltip' });
        markers.push(marker);

        // Small dot markers for intermediate attractions
        dayCoords.forEach((coord, ci) => {
            if (ci === 0) return; // start = day badge
            if (day.hotel?.coords && coord[0] === day.hotel.coords[0] && coord[1] === day.hotel.coords[1]) return; // hotel = separate marker
            const dotMarker = L.circleMarker(coord, {
                radius: 4,
                color: color,
                fillColor: 'white',
                fillOpacity: 1,
                weight: 2
            }).addTo(map);
            markers.push(dotMarker);
        });

        // Hotel marker (end of day) with 🏨 icon
        if (day.hotel?.coords?.length === 2) {
            const hotelCoord = day.hotel.coords;
            // Avoid overlap: only add if this hotel not already marked
            const hotelKey = `${hotelCoord[0].toFixed(3)},${hotelCoord[1].toFixed(3)}`;
            if (!hotelMarkersAdded.has(hotelKey)) {
                hotelMarkersAdded.add(hotelKey);
                const hotelMarker = L.marker(hotelCoord, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="
                            background: white;
                            border: 2px solid ${color};
                            border-radius: 8px;
                            width: 28px;
                            height: 28px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 15px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                        ">🏨</div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    })
                }).addTo(map);
                hotelMarker.bindTooltip(day.hotel.name, { direction: 'top', offset: [0, -14], className: 'map-tooltip' });
                markers.push(hotelMarker);
            }
        }

        // Direction arrow at midpoint of route
        if (dayCoords.length >= 2) {
            const mid = Math.floor(dayCoords.length / 2);
            const p1 = dayCoords[Math.max(0, mid - 1)];
            const p2 = dayCoords[mid];
            const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
            const midPt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
            const arrowMarker = L.marker(midPt, {
                icon: L.divIcon({
                    className: 'route-arrow',
                    html: `<div style="
                        color: ${color};
                        font-size: 16px;
                        font-weight: bold;
                        transform: rotate(${-angle + 90}deg);
                        text-shadow: 0 0 3px white, 0 0 3px white;
                    ">▼</div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(map);
            markers.push(arrowMarker);
        }
    });

    // Draw connecting lines between days (dashed, light gray)
    for (let i = 0; i < currentTripData.days.length - 1; i++) {
        const thisDay = currentTripData.days[i];
        const nextDay = currentTripData.days[i + 1];
        const endCoord = thisDay.hotel?.coords || thisDay.attractions?.slice(-1)[0]?.coords;
        const startCoord = nextDay.attractions?.[0]?.coords || nextDay.hotel?.coords;
        if (endCoord?.length === 2 && startCoord?.length === 2 &&
            (endCoord[0] !== startCoord[0] || endCoord[1] !== startCoord[1])) {
            L.polyline([endCoord, startCoord], {
                color: '#9ca3af',
                weight: 1.5,
                opacity: 0.5,
                dashArray: '6, 6'
            }).addTo(map);
        }
    }

    // Fit bounds to show everything
    if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords).pad(0.12));
    }
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

// Focus map on specific item with appropriate zoom
function focusMapOn(coords, dayIndex) {
    if (!map || !coords || coords.length !== 2) return;

    if (dayIndex !== undefined && currentTripData) {
        const day = currentTripData.days.find(d => d.day === dayIndex);
        if (day) {
            const dayCoordsAll = getDayCoords(day);
            if (dayCoordsAll.length > 1) {
                map.fitBounds(L.latLngBounds(dayCoordsAll).pad(0.3), { maxZoom: 14, duration: 0.6 });
                return;
            }
        }
    }
    map.flyTo(coords, 14, { duration: 0.6 });
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
        block.style.animationDelay = `${index * 0.08}s`;

        let html = `
            <div class="day-header">
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
