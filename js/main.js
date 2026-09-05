const map = L.map('map').setView([34.3966, 132.4596], 14);

L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  maxZoom: 18
}).addTo(map);

const UNLOCK_RADIUS = 100;

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCards() {
  return JSON.parse(localStorage.getItem('infraCards') || '{}');
}

function collectCard(spotId) {
  const cards = getCards();
  const today = new Date().toISOString().slice(0, 10);
  if (cards[spotId]) {
    cards[spotId].visitCount++;
    cards[spotId].lastVisit = today;
  } else {
    cards[spotId] = { visitCount: 1, firstVisit: today, lastVisit: today };
  }
  localStorage.setItem('infraCards', JSON.stringify(cards));
}

function showMsg(text, duration = 2500) {
  const el = document.getElementById('explore-msg');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}

function buildPopup(spot, currentPos) {
  const mapsUrl = `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
  const mapsLink = `<a href="${mapsUrl}" target="_blank">Googleマップで見る</a>`;
  const cardData = getCards()[spot.id];

  let statusSection = '';
  if (currentPos) {
    const dist = Math.round(calcDistance(currentPos.lat, currentPos.lng, spot.lat, spot.lng));
    statusSection = dist <= UNLOCK_RADIUS
      ? (cardData ? `<br>✅ 取得済み（${cardData.visitCount}回訪問）` : `<br>🔍 探索ボタンでカードを取得できます`)
      : `<br>📍 ここまで ${dist}m`;
  }

  return `<b>${spot.name}</b><br>${spot.category}<br>${spot.description}<br>${statusSection}<br>${mapsLink}`;
}

const posIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#e74c3c;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

let currentPos = null;
let posMarker = null;
let spots = [];
let spotMarkers = [];

function updatePopups() {
  spotMarkers.forEach((marker, i) => {
    marker.setPopupContent(buildPopup(spots[i], currentPos));
  });
}

fetch('data/spots.json')
  .then(res => res.json())
  .then(data => {
    spots = data;
    spots.forEach(spot => {
      const marker = L.marker([spot.lat, spot.lng]).addTo(map);
      marker.bindPopup(buildPopup(spot, null));
      spotMarkers.push(marker);
    });
  });

// 探索ボタン
document.getElementById('explore-btn').addEventListener('click', () => {
  if (!currentPos) {
    showMsg('まず地図をクリックして現在地を設定してください');
    return;
  }
  const nearby = spots.filter(spot =>
    calcDistance(currentPos.lat, currentPos.lng, spot.lat, spot.lng) <= UNLOCK_RADIUS
  );
  if (nearby.length === 0) {
    showMsg('近くにスポットがありません');
    return;
  }
  const cards = getCards();
  const newSpots = nearby.filter(s => !cards[s.id]);
  nearby.forEach(spot => collectCard(spot.id));
  updatePopups();
  if (newSpots.length > 0) {
    showMsg(`📋 カードを取得！：${newSpots.map(s => s.name).join('、')}`);
  } else {
    showMsg(`✅ 訪問記録を更新しました（${nearby.map(s => s.name).join('、')}）`);
  }
});

map.on('click', e => {
  currentPos = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (posMarker) posMarker.remove();
  posMarker = L.marker([currentPos.lat, currentPos.lng], { icon: posIcon })
    .addTo(map)
    .bindTooltip('現在地（仮）', { permanent: true, direction: 'top', offset: [0, -12] });
  updatePopups();
});
