const cards = JSON.parse(localStorage.getItem('infraCards') || '{}');
const items = JSON.parse(localStorage.getItem('infraItems') || '{}');

let spotsData = [];
let currentTab = 'cards';

function renderCards() {
  const grid = document.getElementById('card-grid');
  const count = document.getElementById('collect-count');
  const collectedCount = Object.keys(cards).length;
  count.textContent = `${collectedCount} / ${spotsData.length}`;
  grid.innerHTML = '';

  spotsData.forEach(spot => {
    const cardData = cards[spot.id];
    const isCollected = !!cardData;
    const card = document.createElement('div');
    card.className = `card ${isCollected ? 'collected' : 'locked'}`;

    if (isCollected) {
      const imgPath = 'images/spots' + spot.photo;
      card.innerHTML = `
        <img src="${imgPath}" alt="${spot.name}" class="card-img" onerror="this.style.display='none'">
        <div class="card-category">${spot.category}</div>
        <div class="card-name">${spot.name}</div>
        <div class="card-meta">${cardData.visitCount}回訪問</div>
        <div class="card-meta">初回：${cardData.firstVisit}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-lock">?</div>
        <div class="card-name locked-text">???</div>
      `;
    }
    grid.appendChild(card);
  });
}

function renderItems() {
  const grid = document.getElementById('card-grid');
  const count = document.getElementById('collect-count');
  const itemList = Object.entries(items);
  count.textContent = `${itemList.length}個`;
  grid.innerHTML = '';

  if (itemList.length === 0) {
    grid.innerHTML = '<p style="padding:24px;color:#999;">まだアイテムがありません。各地を探索してみよう！</p>';
    return;
  }

  itemList.forEach(([name, data]) => {
    const card = document.createElement('div');
    card.className = 'card collected';
    card.innerHTML = `
      <div class="item-icon">🎁</div>
      <div class="card-name">${name}</div>
      <div class="card-meta">${data.city}</div>
      <div class="card-meta">${data.date}</div>
    `;
    grid.appendChild(card);
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if (tab === 'cards') renderCards();
  else renderItems();
}

fetch('data/spots.json')
  .then(res => res.json())
  .then(data => {
    spotsData = data;
    renderCards();
  });

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
