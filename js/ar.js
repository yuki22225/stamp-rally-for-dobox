// ar.html?id=facility-014 のように、表示するスポットをURLで指定する
const spotId = new URLSearchParams(location.search).get('id');
const viewer = document.getElementById('viewer');
const msg = document.getElementById('ar-msg');

function showMsg(text) {
  msg.textContent = text;
  msg.classList.remove('hidden');
}

fetch('data/spots.json')
  .then(res => res.json())
  .then(spots => {
    const spot = spots.find(s => s.id === spotId);
    if (!spot) {
      showMsg('スポットが見つかりません');
      return;
    }
    document.getElementById('spot-name').textContent = spot.name;
    document.title = `${spot.name} | ミニチュアAR`;
    viewer.src = `models/${spot.id}.glb`;
  });

viewer.addEventListener('error', () => {
  showMsg('このスポットの模型はまだありません');
});
