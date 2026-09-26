/* PTM — Uganda Map page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'map' });

  const G = PTM.geo;
  const host = document.getElementById('map-host');
  const tt = document.getElementById('tt');
  const layers = { cam: true, inc: true, lbl: true, lake: true };
  let selected = null;

  const STATUS_COLOR = c => !c.online ? '#5a6272' : c.congestion ? '#ffc93c' : '#4ee79d';

  function incidentsByDistrict() {
    const m = {};
    PTM.incidents.active().forEach(i => { m[i.district] = (m[i.district] || 0) + 1; });
    return m;
  }

  function buildSVG() {
    const inc = incidentsByDistrict();
    const vb = G.GEO;
    let s = `<svg viewBox="0 0 ${vb.vbW} ${vb.vbH}" role="img" aria-label="Map of Uganda with PTM camera coverage">`;
    s += `<defs>
      <radialGradient id="mapGlow" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="#0d1420"/><stop offset="100%" stop-color="#05070c"/>
      </radialGradient>
    </defs>`;
    s += `<rect x="0" y="0" width="${vb.vbW}" height="${vb.vbH}" fill="url(#mapGlow)"/>`;
    // graticule
    for (let lon = 30; lon <= 35; lon++) {
      const a = G.project(lon, vb.latMax), b = G.project(lon, vb.latMin);
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`;
    }
    for (let lat = -1; lat <= 4; lat++) {
      const a = G.project(vb.lonMin, lat), b = G.project(vb.lonMax, lat);
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`;
    }
    // border + land
    s += `<path d="${G.borderPath()}" fill="rgba(255,201,60,0.05)" stroke="rgba(255,201,60,0.5)" stroke-width="1.6" stroke-linejoin="round"/>`;
    // lakes
    if (layers.lake) {
      G.lakes().forEach(l => { s += `<path d="${l.d}" fill="rgba(59,167,255,0.20)" stroke="rgba(59,167,255,0.45)" stroke-width="1"/>`; });
    }
    // district labels
    if (layers.lbl) {
      PTM.cameras.districts().forEach(d => {
        const p = G.project(d.lon, d.lat);
        s += `<text x="${p.x}" y="${p.y - 12}" fill="rgba(255,255,255,0.5)" font-size="10" font-family="ui-monospace,monospace" text-anchor="middle" letter-spacing="1">${U.esc(d.city.toUpperCase())}</text>`;
      });
    }
    // incident halos
    if (layers.inc) {
      PTM.incidents.active().slice(0, 40).forEach(i => {
        const p = G.project(i.lon, i.lat);
        s += `<circle class="halo" cx="${p.x}" cy="${p.y}" r="7" fill="none" stroke="rgba(255,77,77,0.7)" stroke-width="1.4"/>`;
        s += `<circle cx="${p.x}" cy="${p.y}" r="2.6" fill="#ff4d4d"/>`;
      });
    }
    // camera markers grouped per district (clickable cluster)
    if (layers.cam) {
      PTM.cameras.districts().forEach(d => {
        const cams = PTM.cameras.byDistrict(d.city);
        const p = G.project(d.lon, d.lat);
        const on = cams.filter(c => c.online).length;
        const r = 5 + Math.sqrt(cams.length) * 1.5;
        const sel = selected === d.city;
        s += `<g class="map-marker" data-district="${U.esc(d.city)}" tabindex="0">
          <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="rgba(78,231,157,0.16)" stroke="${sel ? '#ffc93c' : 'rgba(78,231,157,0.75)'}" stroke-width="${sel ? 2.4 : 1.3}"/>
          <circle cx="${p.x}" cy="${p.y}" r="${Math.max(2.4, r * 0.4)}" fill="${on === cams.length ? '#4ee79d' : '#ffc93c'}"/>
          <text x="${p.x}" y="${p.y + r + 12}" fill="rgba(255,255,255,0.75)" font-size="9.5" font-family="ui-monospace,monospace" text-anchor="middle">${cams.length}</text>
        </g>`;
      });
    }
    // police units
    s += PTM.incidents.active().filter(i => i.assignedUnit).slice(0, 12).map(i => {
      const p = G.project(i.lon + 0.06, i.lat - 0.05);
      return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3ba7ff" stroke="#05070c" stroke-width="1"/>`;
    }).join('');
    s += '</svg>';
    host.innerHTML = s;

    host.querySelectorAll('.map-marker').forEach(g => {
      const name = g.dataset.district;
      g.addEventListener('mouseenter', e => showTip(e, name));
      g.addEventListener('mousemove', e => moveTip(e));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('click', () => { selected = name; buildSVG(); renderSide(name); });
    });
  }

  function showTip(e, name) {
    const cams = PTM.cameras.byDistrict(name);
    const on = cams.filter(c => c.online).length;
    const inc = incidentsByDistrict()[name] || 0;
    tt.innerHTML = `<b>${U.esc(name)}</b>
      <div class="tt-row"><span>Cameras</span><span>${cams.length}</span></div>
      <div class="tt-row"><span>Online</span><span>${on}</span></div>
      <div class="tt-row"><span>Active incidents</span><span>${inc}</span></div>`;
    tt.style.display = 'block';
    moveTip(e);
  }
  function moveTip(e) {
    const shell = host.closest('.map-shell').getBoundingClientRect();
    tt.style.left = Math.min(shell.width - 190, e.clientX - shell.left + 14) + 'px';
    tt.style.top = Math.max(8, e.clientY - shell.top - 10) + 'px';
  }
  function hideTip() { tt.style.display = 'none'; }

  function renderSide(name) {
    const t = document.getElementById('side-title');
    const b = document.getElementById('side-body');
    if (!name) {
      const all = PTM.cameras.all();
      t.textContent = 'National overview';
      b.innerHTML = `
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          <div class="stat"><div class="stat-value">${U.num(all.length)}</div><div class="stat-label">Cameras</div></div>
          <div class="stat"><div class="stat-value" style="color:var(--green)">${U.num(PTM.cameras.online().length)}</div><div class="stat-label">Online</div></div>
          <div class="stat"><div class="stat-value" style="color:var(--red)">${U.num(PTM.incidents.active().length)}</div><div class="stat-label">Active incidents</div></div>
          <div class="stat"><div class="stat-value">${U.num(PTM.cameras.districts().length)}</div><div class="stat-label">Districts</div></div>
        </div>
        <p class="small muted" style="margin:14px 0 0;line-height:1.6">Click any district marker to inspect its local fleet, congestion and incidents.</p>`;
      return;
    }
    const cams = PTM.cameras.byDistrict(name);
    const on = cams.filter(c => c.online);
    const cong = cams.filter(c => c.online && c.congestion);
    const incs = PTM.incidents.all().filter(i => i.district === name && i.status !== 'RESOLVED');
    t.textContent = name + ' district';
    b.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:1fr 1fr">
        <div class="stat"><div class="stat-value">${cams.length}</div><div class="stat-label">Cameras</div></div>
        <div class="stat"><div class="stat-value" style="color:var(--green)">${on.length}</div><div class="stat-label">Online</div></div>
        <div class="stat"><div class="stat-value" style="color:var(--amber)">${cong.length}</div><div class="stat-label">Congested</div></div>
        <div class="stat"><div class="stat-value" style="color:var(--red)">${incs.length}</div><div class="stat-label">Incidents</div></div>
      </div>
      <div class="panel-title" style="margin:16px 0 8px">Sample feeds</div>
      ${cams.slice(0, 5).map(c => `
        <div class="row-between small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span class="mono">${U.esc(c.id)}</span>
          <span class="muted" style="flex:1;margin:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(c.road)}</span>
          <span class="badge ${c.online ? (c.congestion ? 'badge-pending' : 'badge-online') : 'badge-offline'}">${c.online ? (c.congestion ? 'CONGESTED' : 'ONLINE') : 'OFFLINE'}</span>
        </div>`).join('')}
      <a class="btn btn-outline btn-sm btn-block" style="margin-top:14px" href="cameras.html">Open ${U.esc(name)} cameras</a>`;
  }

  function renderTable() {
    const inc = incidentsByDistrict();
    document.getElementById('dist-body').innerHTML = PTM.cameras.districts().map(d => {
      const cams = PTM.cameras.byDistrict(d.city);
      const on = cams.filter(c => c.online).length;
      const cong = cams.filter(c => c.online && c.congestion).length;
      const pct = Math.round(on / cams.length * 100);
      return `<tr>
        <td><strong>${U.esc(d.city)}</strong></td>
        <td class="mono">${cams.length}</td>
        <td class="mono" style="color:var(--green)">${on}</td>
        <td class="mono" style="color:var(--muted-2)">${cams.length - on}</td>
        <td class="mono" style="color:var(--amber)">${cong}</td>
        <td class="mono" style="color:var(--red)">${inc[d.city] || 0}</td>
        <td><div class="bar-track" style="min-width:90px"><div class="bar-fill" style="width:${pct}%"></div></div></td>
      </tr>`;
    }).join('');
  }

  ['cam', 'inc', 'lbl', 'lake'].forEach(k => {
    document.getElementById('ly-' + k).addEventListener('change', e => { layers[k] = e.target.checked; buildSVG(); });
  });

  buildSVG();
  renderSide(null);
  renderTable();
  setInterval(() => { buildSVG(); }, 12000);
})();
