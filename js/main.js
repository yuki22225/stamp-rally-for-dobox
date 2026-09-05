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

function buildPopup(spot, currentPos) {
  const mapsUrl = `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
  const mapsLink = `<a href="${mapsUrl}" target="_blank">Googleマップで見る</a>`;

  if (!currentPos) {
    return `<b>${spot.name}</b><br>${spot.category}<br>${spot.description}<br><br>${mapsLink}`;
  }

  const dist = Math.round(calcDistance(currentPos.lat, currentPos.lng, spot.lat, spot.lng));
  const status = dist <= UNLOCK_RADIUS ? '✅ 範囲内！スタンプ取得可能' : `📍 ここまで ${dist}m`;
  return `<b>${spot.name}</b><br>${spot.category}<br>${spot.description}<br><br>${status}<br>${mapsLink}`;
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

// 地図クリックで仮の現在地を設定（デバッグ用）
map.on('click', e => {
  currentPos = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (posMarker) posMarker.remove();
  posMarker = L.marker([currentPos.lat, currentPos.lng], { icon: posIcon })
    .addTo(map)
    .bindTooltip('現在地（仮）', { permanent: true, direction: 'top', offset: [0, -12] });
  updatePopups();
});
