(async () => {
  const sites = await fetch('./data/sites.json').then(r => r.json());
  const poems = await fetch('./data/poems.json').then(r => r.json());
  const labelsLayer = document.getElementById('labels');
  const map = window._map;

  function shortLabel(site) {
    if (site.poemId && poems[site.poemId]) return poems[site.poemId].label;
    return site.name.slice(0, 2);
  }

  function render() {
    labelsLayer.innerHTML = '';
    sites.forEach(s => {
      const pt = map.latLngToContainerPoint([s.lat, s.lng]);
      const el = document.createElement('div');
      el.className = 'poem-label';
      el.style.left = `${pt.x - 19}px`;
      el.style.top = `${pt.y - 30}px`;
      el.dataset.siteId = s.siteId;
      el.innerHTML = `<div class="frame"><div class="text">${shortLabel(s)}</div></div>`;
      el.addEventListener('click', () => window._openDrawer && window._openDrawer(s, poems[s.poemId]));
      labelsLayer.appendChild(el);
    });
  }
  map.on('move zoom moveend zoomend', render);
  render();
  window._sitesData = sites;
  window._poemsData = poems;
})();
