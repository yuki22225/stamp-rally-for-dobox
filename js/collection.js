const cards = JSON.parse(localStorage.getItem('infraCards') || '{}');

fetch('data/spots.json')
  .then(res => res.json())
  .then(spots => {
    const collectedCount = Object.keys(cards).length;
    document.getElementById('collect-count').textContent = `${collectedCount} / ${spots.length}`;

    spots.forEach(spot => {
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

      document.getElementById('card-grid').appendChild(card);
    });
  });
