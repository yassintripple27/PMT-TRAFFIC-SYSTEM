/* PTM — Live Cameras page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'cameras' });

  const state = { q: '', district: 'all', status: 'all', grid: 12, shown: 24 };
  let sims = [];
  let detailSim = null;

  const wall = document.getElementById('wall');
  const qEl = document.getElementById('q');
  const districtEl = document.getElementById('district');
  const countEl = document.getElementById('result-count');
  const moreBtn = document.getElementById('more');

  /* district filter options */
  districtEl.innerHTML = '<option value="all">All districts</option>' +
    PTM.cameras.districts().map(d => `<option value="${U.esc(d.city)}">${U.esc(d.city)}</option>`).join('');

  function filtered() {
    let list = PTM.cameras.search(state.q);
    if (state.district !== 'all') list = list.filter(c => c.district === state.district);
    if (state.status === 'online') list = list.filter(c => c.online);
    else if (state.status === 'offline') list = list.filter(c => !c.online);
    else if (state.status === 'congestion') list = list.filter(c => c.online && c.congestion);
    return list;
  }

  function destroySims() {
    sims.forEach(s => s.destroy());
    sims = [];
  }

  function renderKpis() {
    const all = PTM.cameras.all();
    const on = PTM.cameras.online().length;
    const cong = all.filter(c => c.online && c.congestion).length;
    document.getElementById('cam-kpis').innerHTML = [
      ['Fleet size', U.num(all.length), 'cameras configured'],
      ['Online', U.num(on), ((on / all.length) * 100).toFixed(1) + '% availability'],
      ['Offline', U.num(all.length - on), 'awaiting technician'],
      ['Congested', U.num(cong), 'heavy-flow corridors'],
      ['Districts', U.num(PTM.cameras.districts().length), 'covered nationwide']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
  }

  function renderWall() {
    destroySims();
    const list = filtered();
    countEl.textContent = list.length + ' match' + (list.length === 1 ? '' : 'es');
    wall.dataset.grid = state.grid;
    wall.innerHTML = '';
    if (!list.length) {
      wall.innerHTML = '<div class="glass empty" style="grid-column:1/-1">No cameras match the current filters.</div>';
      moreBtn.style.display = 'none';
      return;
    }
    list.slice(0, state.shown).forEach(cam => {
      const t = PTM.cameraTile(cam, { quality: 'low', aiLabels: false });
      if (t.sim) sims.push(t.sim);
      t.tile.addEventListener('click', () => openDetail(cam));
      wall.appendChild(t.tile);
    });
    moreBtn.style.display = state.shown < list.length ? '' : 'none';
    moreBtn.textContent = `Load more cameras (${Math.max(0, list.length - state.shown)} remaining)`;
  }

  function renderDirectory() {
    const list = filtered();
    document.getElementById('dir-count').textContent = U.num(list.length) + ' units';
    document.getElementById('dir-body').innerHTML = list.slice(0, 80).map(c => `
      <tr>
        <td class="mono">${U.esc(c.id)}</td>
        <td>${U.esc(c.location)}</td>
        <td>${U.esc(c.district)}</td>
        <td class="muted">${U.esc(c.type)}</td>
        <td>${c.online
          ? (c.congestion ? '<span class="badge badge-pending"><span class="dot"></span>CONGESTED</span>' : '<span class="badge badge-online"><span class="dot"></span>ONLINE</span>')
          : '<span class="badge badge-offline">OFFLINE</span>'}</td>
        <td>${c.anpr ? '<span class="badge badge-blue">ANPR</span>' : '<span class="muted-2 tiny">—</span>'}</td>
        <td class="mono">${c.speedLimit} km/h</td>
        <td class="muted mono tiny">${U.ago(c.lastPing)}</td>
        <td><button class="btn btn-ghost btn-xs" data-open="${U.esc(c.id)}">View</button></td>
      </tr>`).join('');
  }

  function openDetail(cam) {
    if (detailSim) { detailSim.destroy(); detailSim = null; }
    const m = PTM.modal({
      title: cam.id + ' — ' + cam.location,
      subtitle: `${U.esc(cam.district)} · ${U.esc(cam.type)} · ${U.esc(cam.gps)} · installed ${U.esc(cam.installed)} · fw ${U.esc(cam.firmware)}`,
      width: 940,
      body: `
        <div class="stage" style="aspect-ratio:16/9;position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--stroke)">
          <canvas id="detail-canvas"></canvas>
          <div class="cctv-fx"></div>
          ${cam.online ? '' : '<div class="cam-offline"><span>No signal — unit offline</span></div>'}
        </div>
        <div class="row" style="flex-wrap:wrap;gap:10px;margin-top:16px">
          <span class="badge ${cam.online ? 'badge-online' : 'badge-offline'}"><span class="dot"></span>${cam.online ? 'ONLINE' : 'OFFLINE'}</span>
          ${cam.congestion ? '<span class="badge badge-pending">CONGESTION</span>' : ''}
          ${cam.anpr ? '<span class="badge badge-blue">ANPR ENABLED</span>' : ''}
          ${cam.pedestrianZone ? '<span class="badge badge-gold">PEDESTRIAN ZONE</span>' : ''}
          <span class="badge badge-sim">SIMULATED FEED</span>
          <span class="spacer"></span>
          <span class="small muted mono">last ping ${U.ago(cam.lastPing)} · limit ${cam.speedLimit} km/h</span>
        </div>
        <div class="notice" style="margin-top:16px">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg>
          <div>This preview is a simulated render for demonstration. PTM controls (PTZ, zoom) are only shown as functional when the connected device reports support for them.</div>
        </div>`,
      footer: `<a class="btn btn-outline" href="command-center.html">Open in Command Center</a><button class="btn btn-ghost" data-close>Close</button>`,
      onClose: () => { if (detailSim) { detailSim.destroy(); detailSim = null; } }
    });
    m.el.querySelector('[data-close]').addEventListener('click', m.close);
    if (cam.online) {
      const canvas = m.el.querySelector('#detail-canvas');
      detailSim = new PTMSim(canvas, {
        seed: cam.seed, camId: cam.id, location: cam.location, district: cam.district,
        hour: cam.hour, weather: cam.weather, density: cam.density, speedLimit: cam.speedLimit,
        pedestrianZone: cam.pedestrianZone, intersection: cam.intersection, gps: cam.gps,
        quality: 'high', ai: true, aiLabels: true
      });
      detailSim.start();
    }
    PTM.audit('CAMERA_VIEW', { camId: cam.id });
  }

  /* events */
  let deb;
  qEl.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { state.q = qEl.value; state.shown = 24; renderWall(); renderDirectory(); }, 220); });
  districtEl.addEventListener('change', () => { state.district = districtEl.value; state.shown = 24; renderWall(); renderDirectory(); });
  document.getElementById('status-group').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#status-group button').forEach(x => x.classList.toggle('active', x === b));
    state.status = b.dataset.status; state.shown = 24; renderWall(); renderDirectory();
  });
  document.getElementById('grid-group').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#grid-group button').forEach(x => x.classList.toggle('active', x === b));
    state.grid = +b.dataset.grid; renderWall();
  });
  moreBtn.addEventListener('click', () => { state.shown += 24; renderWall(); });
  document.getElementById('dir-body').addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const cam = PTM.cameras.get(b.dataset.open);
    if (cam) openDetail(cam);
  });

  renderKpis();
  renderWall();
  renderDirectory();
})();
