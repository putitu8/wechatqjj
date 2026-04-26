(() => {
  const drawer = document.getElementById('drawer');
  const body = drawer.querySelector('.drawer-body');
  const STATES = { collapsed: 60, half: window.innerHeight * 0.5, full: window.innerHeight * 0.9 };
  let state = 'collapsed', startY = 0, currentH = STATES.collapsed, dragging = false;

  function setHeight(h) { drawer.style.height = `${h}px`; currentH = h; }
  function snap(h) {
    const distances = Object.entries(STATES).map(([k, v]) => [k, Math.abs(h - v)]).sort((a, b) => a[1] - b[1]);
    state = distances[0][0];
    drawer.style.transition = 'height 320ms cubic-bezier(.2, .8, .2, 1)';
    setHeight(STATES[state]);
    setTimeout(() => drawer.style.transition = '', 320);
  }

  drawer.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; dragging = true; });
  drawer.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const delta = startY - e.touches[0].clientY;
    setHeight(Math.max(STATES.collapsed, Math.min(STATES.full, currentH + delta)));
    startY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  drawer.addEventListener('touchend', () => { dragging = false; snap(currentH); });

  window._openDrawer = (site, poem) => {
    let html = `<h2>${site.name}</h2><p>${site.intro}</p>`;
    if (poem) {
      html += `<div class="poem"><div class="poem-title">《${poem.title}》</div>`;
      poem.lines.forEach(l => html += `<div class="poem-line">${l}</div>`);
      html += '</div>';
    }
    html += `<div class="actions">
      <button data-act="ask" data-site="${site.siteId}">问问东坡先生</button>
      <button data-act="checkin" data-site="${site.siteId}">我已到此一游</button>
    </div>`;
    body.innerHTML = html;
    body.querySelectorAll('button').forEach(b => b.addEventListener('click', (ev) => {
      const act = ev.target.dataset.act, sid = ev.target.dataset.site;
      window._bridgeAction && window._bridgeAction(act, sid);
    }));
    drawer.style.transition = 'height 320ms cubic-bezier(.2, .8, .2, 1)';
    state = 'half'; setHeight(STATES.half);
  };
})();
