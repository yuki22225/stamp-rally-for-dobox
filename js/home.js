fetch('data/news.json')
  .then(res => res.json())
  .then(news => {
    if (news.length === 0) return;
    const latest = news[0];
    document.getElementById('news-text').textContent = latest.text;
    document.getElementById('news-banner').classList.remove('hidden');
  });
