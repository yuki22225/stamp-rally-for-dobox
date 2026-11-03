// 避難経路タブ：避難所の絞り込みと、自分で引く経路
const WALK_M_PER_MIN = 60;
const GOOGLE_MAX_WAYPOINTS = 8;
const evacLayer = L.layerGroup();
const routeLayer = L.layerGroup();
const shelterRenderer = L.canvas({ padding: 0.3 });
let shelters = null;
let drawing = false;
let draft = { points: [], goal: null };

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

function escapeXml(text) {
  return String(text ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function buildShelterPopup(s) {
  const types = s.types.length > 0 ? s.types.join('、') : '記載なし';
  const capacity = s.capacity == null ? '記載なし' : `${s.capacity}人`;
  return `<b>${escapeHtml(s.name)}</b><br>${escapeHtml(s.address)}<br>対応する災害：${types}<br>定員：${capacity}`;
}

function selectedTypes() {
  return [...document.querySelectorAll('.evac-check:checked')].map(c => c.value);
}

function updateShelters() {
  evacLayer.clearLayers();
  const count = document.getElementById('evac-count');
  if (!shelters) return;
  const types = selectedTypes();
  document.getElementById('route-start').disabled = types.length === 0;
  if (types.length === 0) {
    count.textContent = '何から避難するかを選んでください';
    return;
  }
  const matched = shelters.filter(s => types.every(t => s.types.includes(t)));
  matched.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lng], {
      renderer: shelterRenderer, radius: 5, color: 'white', weight: 1, fillColor: '#2f9e62', fillOpacity: 0.95, bubblingMouseEvents: false
    }).bindPopup(() => buildShelterPopup(s));
    marker.on('popupopen', () => {
      if (!drawing) return;
      marker.closePopup();
      setGoal(s);
    });
    marker.addTo(evacLayer);
  });
  count.textContent = matched.length > 0
    ? `${matched.length}か所`
    : '該当する避難所がありません。チェックを減らしてください';
  if (drawing && draft.goal && !types.every(t => draft.goal.types.includes(t))) {
    draft.goal = null;
    updateDraft();
  }
}

async function loadShelters() {
  if (shelters) return;
  document.getElementById('evac-count').textContent = '読み込み中…';
  try {
    shelters = await fetch('data/shelters.json').then(res => res.json());
  } catch {
    document.getElementById('evac-count').textContent = '避難所を読み込めませんでした';
    return;
  }
  updateShelters();
}

// ------ 経路の計算と表示 ------
function routeLine(route) {
  return route.goal ? [...route.points, [route.goal.lat, route.goal.lng]] : route.points;
}

function routeLength(route) {
  const line = routeLine(route);
  let total = 0;
  for (let i = 1; i < line.length; i++) total += calcDistance(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
  return total;
}

function routeSummary(route) {
  const length = Math.round(routeLength(route));
  return `約${length}m ／ 徒歩 約${Math.max(1, Math.round(length / WALK_M_PER_MIN))}分`;
}

function drawRoute(route) {
  routeLayer.clearLayers();
  const line = routeLine(route);
  if (line.length > 1) {
    L.polyline(line, { color: 'white', weight: 8, opacity: 0.9, interactive: false }).addTo(routeLayer);
    L.polyline(line, { color: '#1f78b4', weight: 4, interactive: false }).addTo(routeLayer);
  }
  route.points.forEach((p, i) => {
    L.circleMarker(p, {
      radius: i === 0 ? 8 : 4, color: 'white', weight: 2, fillColor: i === 0 ? '#e74c3c' : '#1f78b4', fillOpacity: 1, interactive: false
    }).addTo(routeLayer);
  });
  if (route.goal) {
    L.circleMarker([route.goal.lat, route.goal.lng], { radius: 10, color: 'white', weight: 3, fillColor: '#2f9e62', fillOpacity: 1, interactive: false })
      .bindTooltip(escapeHtml(route.goal.name), { permanent: true, direction: 'top', offset: [0, -8] }).addTo(routeLayer);
  }
}

// ------ 経路を引く ------
function updateDraft() {
  drawRoute(draft);
  const status = document.getElementById('route-status');
  if (draft.points.length === 0) status.textContent = '出発地をタップしてください';
  else if (!draft.goal) status.textContent = `通りたい道を順にタップして、最後に緑の避難所を押してください（${routeSummary(draft)}）`;
  else status.textContent = `ゴール：${draft.goal.name}（${routeSummary(draft)}）`;
  document.getElementById('route-undo').disabled = draft.points.length === 0;
  document.getElementById('route-save-box').hidden = !draft.goal;
  if (draft.goal && !document.getElementById('route-name').value) document.getElementById('route-name').value = `${draft.goal.name}まで`;
}

function setGoal(s) {
  if (draft.points.length === 0) {
    document.getElementById('route-status').textContent = '先に出発地をタップしてください';
    return;
  }
  draft.goal = { name: s.name, lat: s.lat, lng: s.lng, types: s.types };
  updateDraft();
}

function startDrawing() {
  drawing = true;
  draft = { points: [], goal: null };
  document.getElementById('route-name').value = '';
  document.getElementById('route-idle').hidden = true;
  document.getElementById('route-draw').hidden = false;
  document.getElementById('evac-note').hidden = true;
  updateDraft();
}

function stopDrawing() {
  drawing = false;
  document.getElementById('route-idle').hidden = false;
  document.getElementById('route-draw').hidden = true;
  document.getElementById('evac-note').hidden = false;
}

document.getElementById('route-start').addEventListener('click', startDrawing);
document.getElementById('route-undo').addEventListener('click', () => {
  if (draft.goal) draft.goal = null;
  else draft.points.pop();
  updateDraft();
});
document.getElementById('route-cancel').addEventListener('click', () => {
  stopDrawing();
  routeLayer.clearLayers();
});
map.on('click', e => {
  if (appMode !== 'evac' || !drawing || draft.goal) return;
  draft.points.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
  updateDraft();
});

// ------ お気に入り（この端末だけに保存する） ------
function getRoutes() {
  try {
    return JSON.parse(localStorage.getItem('infraRoutes') || '[]');
  } catch {
    return [];
  }
}

function setRoutes(routes) {
  localStorage.setItem('infraRoutes', JSON.stringify(routes));
  renderRoutes();
}

document.getElementById('route-save').addEventListener('click', () => {
  const name = document.getElementById('route-name').value.trim() || `${draft.goal.name}まで`;
  const route = { id: String(Date.now()), name, types: selectedTypes(), points: draft.points, goal: draft.goal, date: new Date().toLocaleDateString('sv-SE') };
  try {
    setRoutes([route, ...getRoutes()]);
  } catch {
    document.getElementById('route-status').textContent = '保存できませんでした。ブラウザの設定を確かめてください';
    return;
  }
  stopDrawing();
  drawRoute(route);
});

function googleUrl(route) {
  const fmt = p => `${p[0]},${p[1]}`;
  const [origin, ...rest] = route.points;
  const step = Math.max(1, rest.length / GOOGLE_MAX_WAYPOINTS);
  const via = [];
  for (let i = 0; i < rest.length && via.length < GOOGLE_MAX_WAYPOINTS; i += step) via.push(rest[Math.floor(i)]);
  const params = new URLSearchParams({ api: '1', origin: fmt(origin), destination: fmt([route.goal.lat, route.goal.lng]), travelmode: 'walking' });
  if (via.length > 0) params.set('waypoints', via.map(fmt).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

function routeKml(route) {
  const coord = p => `${p[1]},${p[0]},0`;
  const line = routeLine(route).map(coord).join(' ');
  const desc = `${route.types.join('・')}用 ／ ${routeSummary(route)} ／ ${route.date} 作成`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(route.name)}</name>
    <Style id="route"><LineStyle><color>ffb4781f</color><width>5</width></LineStyle></Style>
    <Placemark><name>${escapeXml(route.name)}</name><description>${escapeXml(desc)}</description><styleUrl>#route</styleUrl><LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString></Placemark>
    <Placemark><name>出発地</name><Point><coordinates>${coord(route.points[0])}</coordinates></Point></Placemark>
    <Placemark><name>${escapeXml(route.goal.name)}</name><description>${escapeXml(route.goal.types.join('・'))}</description><Point><coordinates>${coord([route.goal.lat, route.goal.lng])}</coordinates></Point></Placemark>
  </Document>
</kml>
`;
}

function saveKml(route) {
  const url = URL.createObjectURL(new Blob([routeKml(route)], { type: 'application/vnd.google-earth.kml+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${route.name.replace(/[\\/:*?"<>|]/g, '_')}.kml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderRoutes() {
  const box = document.getElementById('route-list');
  const routes = getRoutes();
  box.innerHTML = '';
  box.hidden = routes.length === 0;
  routes.forEach(route => {
    const row = document.createElement('div');
    row.className = 'route-item';
    row.innerHTML = `<b>${escapeHtml(route.name)}</b><span>${escapeHtml(route.types.join('・'))} ／ ${routeSummary(route)}</span>` +
      `<div class="route-actions"><button type="button" data-act="show">地図で見る</button>` +
      `<a href="${escapeHtml(googleUrl(route))}" target="_blank" rel="noopener">Googleマップで開く</a>` +
      `<button type="button" data-act="kml">マイマップ用に保存</button><button type="button" data-act="del">削除</button></div>`;
    row.querySelector('[data-act="show"]').addEventListener('click', () => {
      drawRoute(route);
      map.fitBounds(L.latLngBounds(routeLine(route)), { padding: [40, 40], maxZoom: 17 });
    });
    row.querySelector('[data-act="kml"]').addEventListener('click', () => saveKml(route));
    row.querySelector('[data-act="del"]').addEventListener('click', () => {
      routeLayer.clearLayers();
      setRoutes(getRoutes().filter(r => r.id !== route.id));
    });
    box.appendChild(row);
  });
}

// ------ タブの切り替え ------
function setMode(mode) {
  appMode = mode;
  const evacOn = mode === 'evac';
  document.querySelectorAll('.mode-tab').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode)));
  document.getElementById('explore-btn').hidden = evacOn;
  document.getElementById('explore-msg').classList.add('hidden');
  document.getElementById('evac-panel').hidden = !evacOn;
  spotMarkers.forEach(m => (evacOn ? m.remove() : m.addTo(map)));
  if (posMarker) (evacOn ? posMarker.remove() : posMarker.addTo(map));
  if (evacOn) {
    evacLayer.addTo(map);
    routeLayer.addTo(map);
    loadShelters();
    renderRoutes();
  } else {
    evacLayer.remove();
    routeLayer.remove();
  }
}

document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
document.querySelectorAll('.evac-check').forEach(c => c.addEventListener('change', updateShelters));
