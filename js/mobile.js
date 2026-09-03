// ==================== Mobile Trip View ====================
let map = null;

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        showError();
        return;
    }

    try {
        const resp = await fetch(`/api/trip/${id}`);
        if (!resp.ok) {
            showError();
            return;
        }
        const tripData = await resp.json();
        renderTrip(tripData);
    } catch (e) {
        console.error('Load error:', e);
        showError();
    }
}

function showError() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
}

function renderTrip(trip) {
    // Hide loading, show content
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('trip-content').style.display = 'block';

    // Set header
    document.getElementById('trip-title').textContent = trip.title || '我的行程';
    document.getElementById('trip-dates').textContent = `📅 ${trip.dateRange || '待定'}`;
    document.getElementById('trip-mode').textContent = `🚗 ${trip.mode || '自由行'}`;
    document.getElementById('trip-travelers').textContent = `👤 ${trip.travelers || ''}`;

    // Count stats
    let totalAttr = 0;
    let totalHotels = new Set();
    trip.days?.forEach(d => {
        const items = d.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction') totalAttr++;
        });
        if (d.hotel) totalHotels.add(d.hotel.name);
    });

    document.getElementById('total-days').textContent = trip.days?.length || 0;
    document.getElementById('total-hotels').textContent = totalHotels.size;
    document.getElementById('total-attractions').textContent = totalAttr;

    // Render timeline
    renderTimeline(trip);
    // Render map
    setTimeout(() => renderMap(trip), 100);
}

function renderTimeline(trip) {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    trip.days?.forEach(day => {
        const card = document.createElement('div');
        card.className = 'day-card';

        let html = `
            <div class="day-header">
                <div class="day-badge">D${day.day}</div>
                <div class="day-info">
                    <div class="day-title">${escapeHtml(day.title || '')}</div>
                    <div class="day-route">${escapeHtml(day.route || '')}${day.driving ? ' · ' + escapeHtml(day.driving) : ''}</div>
                </div>
            </div>
        `;

        // Render schedule
        const items = day.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction' && item.data) {
                html += renderAttractionItem(item.data, item.startTime);
            } else if (item.type === 'commute') {
                html += renderCommuteItem(item);
            } else if (item.type === 'transport' && item.data) {
                html += renderTransportItem(item.data);
            }
        });

        // Hotel at the end of day
        if (day.hotel) {
            html += renderHotelItem(day.hotel);
        }

        card.innerHTML = html;
        container.appendChild(card);
    });
}

function renderAttractionItem(attr, startTime) {
    const time = startTime || '';
    return `
        <div class="schedule-item">
            <div class="schedule-time">
                <strong>${time || '--'}</strong>
                ${attr.duration || ''}
            </div>
            <div class="schedule-body">
                <div class="schedule-name">${attr.icon || '📍'} ${escapeHtml(attr.name)}</div>
                <div class="schedule-meta">${escapeHtml(attr.ticket || '')}</div>
                ${attr.coords?.length === 2 ? renderNavButtons(attr.coords, attr.name) : ''}
            </div>
        </div>
    `;
}

function renderCommuteItem(commute) {
    return `
        <div class="commute-item">
            <span class="icon">${commute.icon || '🚶'}</span>
            <span>${escapeHtml(commute.mode || '')}</span>
            <span style="color:#94a3b8">·</span>
            <span>${escapeHtml(commute.duration || '')}</span>
            ${commute.cost && commute.cost !== '免费' ? `<span style="color:#ea580c">· ${escapeHtml(commute.cost)}</span>` : ''}
            ${commute.detail ? `<div style="width:100%;font-size:11px;color:#94a3b8;padding-left:22px;margin-top:2px">${escapeHtml(commute.detail)}</div>` : ''}
        </div>
    `;
}

function renderTransportItem(transport) {
    return `
        <div class="transport-item">
            <div class="transport-title">${transport.mode || '🚗 自驾'} · ${escapeHtml(transport.from || '')} → ${escapeHtml(transport.to || '')}</div>
            <div class="transport-detail">${escapeHtml(transport.distance || '')} · ${escapeHtml(transport.duration || '')}</div>
            ${transport.departSuggestion ? `<div class="transport-detail">🕐 ${escapeHtml(transport.departSuggestion)}</div>` : ''}
            ${transport.arriveEstimate ? `<div class="transport-detail">📍 ${escapeHtml(transport.arriveEstimate)}</div>` : ''}
            ${transport.tips ? `<div class="transport-tip">💡 ${escapeHtml(transport.tips)}</div>` : ''}
        </div>
    `;
}

function renderHotelItem(hotel) {
    return `
        <div class="hotel-item">
            <div class="hotel-header">
                <div class="hotel-name">🏨 ${escapeHtml(hotel.name)}</div>
                <div class="hotel-price"><small>¥</small>${hotel.price}</div>
            </div>
            <div class="hotel-reason">${escapeHtml(hotel.reason || '')}</div>
            ${hotel.tags?.length ? `
                <div class="hotel-tags">
                    ${hotel.tags.map(t => `<span class="hotel-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
            ` : ''}
            ${hotel.coords?.length === 2 ? renderNavButtons(hotel.coords, hotel.name) : ''}
        </div>
    `;
}

function renderNavButtons(coords, name) {
    const [lat, lng] = coords;
    const encodedName = encodeURIComponent(name);
    return `
        <div class="nav-buttons">
            <a class="nav-btn amap" href="https://uri.amap.com/marker?position=${lng},${lat}&name=${encodedName}&src=mypage&coordinate=gaode&callnative=1" target="_blank" rel="noopener">
                🗺️ 高德
            </a>
            <a class="nav-btn bmap" href="https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodedName}&content=${encodedName}&output=html&coord_type=gcj02&src=mypage" target="_blank" rel="noopener">
                📍 百度
            </a>
            <a class="nav-btn gmap" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedName}" target="_blank" rel="noopener">
                🌐 Google
            </a>
        </div>
    `;
}

function renderMap(trip) {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([35, 105], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, subdomains: 'abc'
    }).addTo(map);

    const allCoords = [];
    trip.days?.forEach(day => {
        const items = day.schedule || [];
        items.forEach(item => {
            if (item.type === 'attraction' && item.data?.coords?.length === 2) {
                allCoords.push(item.data.coords);
            }
        });
        if (day.hotel?.coords?.length === 2) allCoords.push(day.hotel.coords);
    });

    if (allCoords.length > 0) {
        allCoords.forEach((coord, i) => {
            L.circleMarker(coord, {
                radius: 5,
                color: '#2563eb',
                fillColor: 'white',
                fillOpacity: 1,
                weight: 2
            }).addTo(map);
        });
        if (allCoords.length > 1) {
            L.polyline(allCoords, { color: '#2563eb', weight: 2, opacity: 0.5 }).addTo(map);
            map.fitBounds(L.latLngBounds(allCoords).pad(0.1));
        } else {
            map.setView(allCoords[0], 13);
        }
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

init();