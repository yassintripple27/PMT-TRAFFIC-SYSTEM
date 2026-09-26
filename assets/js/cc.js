/* PTM — Live Traffic Command Center */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'command' });

  const wallEl = document.getElementById('wall');
  const stageCanvas = document.getElementById('stage-canvas');
  const stageEl = document.getElementById('stage');
  const alertList = document.getElementById('alert-list');

  let wallSims = [];
  let focused = null;            // { cam, sim }
  let splitSims = [];
  let splitOpen = false;
  let grid = 9;
  let poolOffset = 0;
  let filtered = null;
  let alerts = [];
  let recording = false;
  let ring = [];                 // frame ring buffer for evidence
  let lastIncidentTs = 0;
  const hist = { vpm: [], mpm: [], spd: [] };

  /* ================= pool / wall ================= */
  function pool() {
    if (filtered) return filtered;
    const all = PTM.cameras.all();
    const out = [];
    for (let i = 0; i < all.length; i++) out.push(all[(i + poolOffset) % all.length]);
    return out;
  }

  function buildWall() {
    wallSims.forEach(s => s.sim.destroy());
    wallSims = [];
    wallEl.innerHTML = '';
    wallEl.dataset.grid = grid;
    const cams = pool().slice(0, grid);
    document.getElementById('wall-count').textContent = '· ' + cams.length + ' of ' + PTM.cameras.all().length + ' configured feeds';
    cams.forEach(cam => {
      const t = PTM.cameraTile(cam, { quality: 'low', ai: true, aiLabels: false, emitEvents: true });
      t.tile.addEventListener('click', () => focusCamera(cam.id));
      wallEl.appendChild(t.tile);
      if (t.sim) wallSims.push({ cam, sim: t.sim, tile: t.tile });
    });
    markSelected();
  }

  function markSelected() {
    wallEl.querySelectorAll('.cam-tile').forEach(t => {
      t.classList.toggle('selected', !!focused && t.dataset.cam === focused.cam.id);
    });
  }

  /* ================= focused stage ================= */
  function focusCamera(id, opts) {
    const cam = PTM.cameras.get(id);
    if (!cam) return;
    if (focused) focused.sim.destroy();
    focused = { cam };
    if (!cam.online) {
      stageCanvas.getContext('2d').clearRect(0, 0, stageCanvas.width, stageCanvas.height);
      focused.sim = null;
      document.getElementById('stage-title').textContent = cam.id + ' — OFFLINE';
      document.getElementById('stage-meta').textContent = 'No signal from edge device. Last ping ' + U.ago(cam.lastPing) + '.';
      document.getElementById('stage-hud').innerHTML = '<span class="hud-chip red">SIGNAL LOST</span>';
    } else {
      focused.sim = new PTMSim(stageCanvas, {
        seed: cam.seed, camId: cam.id, location: cam.location, district: cam.district,
        hour: cam.hour, weather: cam.weather, density: cam.density, speedLimit: cam.speedLimit,
        pedestrianZone: cam.pedestrianZone, intersection: cam.intersection, gps: cam.gps,
        quality: 'high', ai: aiOn(), aiLabels: true, emitEvents: true
      });
      focused.sim.start();
      document.getElementById('stage-title').textContent = cam.id + ' · ' + cam.location + ' — ' + cam.district;
    }
    ring = [];
    focusTs = Date.now();
    if (splitOpen) buildSplit();
    markSelected();
    updateStageMeta();
  }

  function aiOn() { return document.getElementById('ai-toggle').checked; }

  function updateStageMeta() {
    if (!focused) return;
    const cam = focused.cam;
    const meta = document.getElementById('stage-meta');
    meta.textContent = `${cam.type} · ${cam.gps} · limit ${cam.speedLimit} km/h · ${cam.weather.toUpperCase()} · fw ${cam.firmware}`;
  }

  function updateStageHud() {
    const host = document.getElementById('stage-hud');
    if (!focused || !focused.sim) return;
    const s = focused.sim.getStats();
    const sig = focused.sim.signalState();
    const d = new Date();
    host.innerHTML = `
      <span class="hud-chip">${U.esc(focused.cam.id)} · ${focused.sim.o.view === 'rear' ? 'REAR' : 'FRONT'}</span>
      <span class="hud-chip gold">SIGNAL ${sig.away.toUpperCase()} / ${sig.toward.toUpperCase()}</span>
      <span class="hud-chip">VEH ${s.vehicles} · MOTO ${s.motorcycles} · PED ${s.pedestrians}</span>
      <span class="hud-chip">AVG ${Math.round(s.avgSpeed)} km/h · ${s.condition}</span>
      <span class="hud-chip">${U.stamp(d)} EAT · ${focused.sim.fps} fps</span>
      ${recording ? '<span class="hud-chip red">● RECORDING</span>' : ''}
    `;
  }

  /* ================= split view ================= */
  function buildSplit() {
    splitSims.forEach(s => s.destroy());
    splitSims = [];
    if (!splitOpen || !focused || !focused.cam.online) return;
    const cam = focused.cam;
    const mk = (canvas, view, seedOff) => new PTMSim(canvas, {
      seed: cam.seed + seedOff, camId: cam.id, location: cam.location, district: cam.district,
      hour: cam.hour, weather: cam.weather, density: cam.density, speedLimit: cam.speedLimit,
      pedestrianZone: cam.pedestrianZone, intersection: cam.intersection, gps: cam.gps,
      quality: 'mid', ai: aiOn(), aiLabels: false, emitEvents: false, view
    });
    splitSims.push(mk(document.getElementById('split-front'), 'front', 0));
    splitSims.push(mk(document.getElementById('split-rear'), 'rear', 991));
    splitSims.forEach(s => s.start());
  }

  /* ================= alerts / events ================= */
  const SEV_CLASS = { critical: 'sev-critical', warning: 'sev-warning', info: 'sev-info' };

  function pushAlert(ev) {
    alerts.unshift(ev);
    if (alerts.length > 60) alerts.pop();
    const d = new Date();
    const item = document.createElement('div');
    item.className = 'alert-item fresh ' + (SEV_CLASS[ev.severity] || 'sev-info');
    item.innerHTML = `
      <div class="alert-time">${U.stamp(d)}</div>
      <div class="alert-body">
        <div class="alert-title"><i></i>${U.esc(ev.detail || ev.type)}</div>
        <div class="alert-meta">${U.esc(ev.camId)} · ${U.esc(ev.location)}${ev.plate ? ' · ' + U.esc(ev.plate) : ''} · conf ${(ev.confidence || 0).toFixed(2)}</div>
      </div>`;
    item.addEventListener('click', () => { focusCamera(ev.camId); item.classList.remove('fresh'); });
    alertList.prepend(item);
    while (alertList.children.length > 40) alertList.removeChild(alertList.lastChild);
    setTimeout(() => item.classList.remove('fresh'), 2600);
    document.getElementById('alert-count').textContent = alerts.length;

    if (ev.severity === 'critical') {
      PTM.toast('red', ev.detail || ev.type, `${ev.camId} · ${ev.location}${ev.plate ? ' · ' + ev.plate : ''}`);
      if (Date.now() - lastIncidentTs > 6000) {
        lastIncidentTs = Date.now();
        PTM.incidents.fromEvent(ev);
      }
    }
    if (focused && ev.camId === focused.cam.id && ['RED_LIGHT', 'SPEED', 'WRONG_SIDE', 'OVERTAKE', 'COLLISION'].includes(ev.type)) {
      openEvidence(ev);
    }
  }

  PTMSim.onEvent(ev => {
    // rate-limit the global stream so the wall never floods the operator
    if (alerts.length && Date.now() - (alerts[0].wallTs || 0) < 1500) return;
    ev.wallTs = Date.now();
    pushAlert(ev);
  });

  /* ================= evidence ================= */
  let lastEvidenceTs = 0;
  let focusTs = 0;

  function openEvidence(ev) {
    if (!focused || !focused.sim) return;
    const now = Date.now();
    if (now - lastEvidenceTs < 20000 || now - focusTs < 6000) return;
    lastEvidenceTs = now;

    const before = ring.slice(-2);
    const frames = before.map(f => ({ url: f.url, t: f.t, tag: 'BEFORE' }));
    while (frames.length < 2) frames.unshift({ url: null, t: now - 2000 + frames.length * 1000, tag: 'BEFORE' });
    frames.push({ url: focused.sim.capture(420, 0.7), t: now, tag: 'VIOLATION', hit: true });

    // collect the two "after" frames from the live feed, then open the modal once
    setTimeout(() => { if (focused && focused.sim) frames.push({ url: focused.sim.capture(420, 0.7), t: Date.now(), tag: 'AFTER' }); }, 1000);
    setTimeout(() => {
      if (focused && focused.sim) frames.push({ url: focused.sim.capture(420, 0.7), t: Date.now(), tag: 'AFTER' });
      frames.forEach(f => { if (!f.url && focused && focused.sim) f.url = focused.sim.capture(420, 0.7); });
      renderEvidenceModal(ev, frames);
    }, 2100);
  }

  function renderEvidenceModal(ev, frames) {
    const rule = PTM.rules.get(ev.type) || { label: ev.type, penalty: 0 };
    const caseId = 'PTM-2026-' + String(4000 + (ev.simTime || 0) % 900 | 0).padStart(6, '0');
    const body = `
      <div class="notice" style="margin-bottom:18px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg>
        <div><b>TRAFFIC VIOLATION DETECTED</b> — AI confidence ${(ev.confidence || 0).toFixed(3)}.
        This event is <b>PENDING VERIFICATION</b>: no penalty is issued until an authorised officer reviews the evidence.</div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:18px">
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">CASE ID</div><div class="mono small" style="margin-top:4px">${caseId}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">PLATE</div><div class="mono small" style="margin-top:4px">${U.esc(ev.plate || '—')}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">VEHICLE</div><div class="small" style="margin-top:4px">${U.esc(ev.vehicleType || '—')}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">VIOLATION</div><div class="small" style="margin-top:4px">${U.esc(rule.label)}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">CAMERA</div><div class="mono small" style="margin-top:4px">${U.esc(ev.camId)}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">LOCATION</div><div class="small" style="margin-top:4px">${U.esc(ev.location)}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">TIME</div><div class="mono small" style="margin-top:4px">${U.dateTime(new Date())}</div></div>
        <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">CONFIGURED PENALTY</div><div class="small" style="margin-top:4px">${U.ugx(rule.penalty)}</div></div>
      </div>
      <div class="panel-title" style="margin-bottom:10px">AI evidence captured — before / during / after</div>
      <div class="timeline">
        ${frames.map(f => `
          <div class="tl-frame${f.hit ? ' hit' : ''}">
            <img src="${f.url}" alt="${f.tag} frame" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">
            <div class="tl-time">${f.tag} · ${U.stamp(new Date(f.t))}</div>
          </div>`).join('')}
      </div>
      <p class="tiny muted-2" style="margin-top:14px;line-height:1.6">
        Frames are captured from the simulated feed at one-second intervals around the moment of violation.
        In production these would be sealed, hashed and stored in the encrypted evidence vault.
      </p>`;
    const m = PTM.modal({
      title: 'Evidence event',
      subtitle: `${ev.camId} · ${ev.location}`,
      body,
      width: 940,
      footer: `
        <button class="btn btn-ghost btn-sm" data-act="video">View video</button>
        <button class="btn btn-ghost btn-sm" data-act="location">View location</button>
        <button class="btn btn-danger btn-sm" data-act="dismiss">Dismiss (below threshold)</button>
        <button class="btn btn-gold btn-sm" data-act="verify">Verify incident</button>`
    });
    m.el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'verify') {
        if (!PTM.session.require('verify', 'Verification requires a Commander or Traffic Admin session.')) return;
        PTM.cases.verify(caseId, PTM.session.user().name);
        PTM.toast('green', 'Incident verified', caseId + ' moved to UNPAID and routed to Fines & Payments.');
        m.close();
      } else if (act === 'dismiss') {
        if (!PTM.session.require('verify', 'Dismissal requires a Commander or Traffic Admin session.')) return;
        PTM.cases.reject(caseId, 'Dismissed by operator after evidence review');
        PTM.toast('gold', 'Event dismissed', 'No case opened. The dismissal is recorded in the audit log.');
        m.close();
      } else if (act === 'video') {
        m.close(); focusCamera(ev.camId);
      } else {
        m.close(); document.getElementById('cc-map').scrollIntoView({ behavior: 'smooth' });
      }
    }));
  }

  /* ================= map ================= */
  function buildMap() {
    const host = document.getElementById('cc-map');
    const cams = PTM.cameras.all();
    const incidents = PTM.incidents.active();
    const districts = PTM.cameras.districts();

    const camDots = cams.map(c => {
      const p = PTM.geo.project(c.lon, c.lat);
      const inc = incidents.find(i => i.camId === c.id);
      const col = !c.online ? '#5a6270' : inc ? '#ff4d4d' : c.congestion ? '#ffc93c' : '#24d17d';
      return `<circle class="map-marker" data-cam="${c.id}" cx="${p.x}" cy="${p.y}" r="3" fill="${col}" opacity="${c.online ? 0.95 : 0.5}" stroke="#05060a" stroke-width="0.7"/>`;
    }).join('');

    const incRings = incidents.slice(0, 26).map(i => {
      const p = PTM.geo.project(i.lon, i.lat);
      return `<circle class="halo" cx="${p.x}" cy="${p.y}" r="6" fill="#ff4d4d" opacity=".5"/>`;
    }).join('');

    const labels = districts.map(d => {
      const p = PTM.geo.project(d.lon, d.lat);
      return `<text x="${p.x}" y="${p.y - 12}" fill="rgba(255,255,255,.62)" font-size="11" font-family="ui-monospace,monospace" text-anchor="middle" style="pointer-events:none">${d.city}</text>`;
    }).join('');

    host.innerHTML = `
      <svg viewBox="0 0 1000 700" role="img" aria-label="Uganda live traffic map">
        <defs>
          <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#141a26"/><stop offset="100%" stop-color="#0a0e16"/>
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="${PTM.geo.borderPath()}" fill="url(#ug2)" stroke="rgba(255,201,60,.5)" stroke-width="2" filter="url(#glow2)"/>
        ${PTM.geo.lakes().map(l => `<path d="${l.d}" fill="rgba(59,167,255,.18)" stroke="rgba(59,167,255,.3)" stroke-width="1"/>`).join('')}
        ${camDots}
        ${incRings}
        ${labels}
      </svg>
      <div class="map-legend">
        <div><i style="background:#24d17d"></i> Camera online</div>
        <div><i style="background:#ffc93c"></i> Traffic congestion</div>
        <div><i style="background:#ff4d4d"></i> Active incident</div>
        <div><i style="background:#5a6270"></i> Camera offline</div>
      </div>
      <div class="map-tooltip" id="cc-tip"></div>`;

    const tip = document.getElementById('cc-tip');
    host.querySelectorAll('.map-marker').forEach(m => {
      const cam = PTM.cameras.get(m.dataset.cam);
      m.addEventListener('mouseenter', e => {
        const inc = PTM.incidents.active().find(i => i.camId === cam.id);
        tip.innerHTML = `<b>${U.esc(cam.id)} · ${U.esc(cam.road)}</b>
          <div class="tt-row"><span>District</span><span>${U.esc(cam.district)}</span></div>
          <div class="tt-row"><span>Status</span><span>${cam.online ? (inc ? 'INCIDENT' : cam.congestion ? 'CONGESTED' : 'ONLINE') : 'OFFLINE'}</span></div>
          <div class="tt-row"><span>Type</span><span>${U.esc(cam.type)}</span></div>
          <div class="tt-row"><span>Click</span><span>open live feed</span></div>`;
        const rect = host.getBoundingClientRect();
        tip.style.left = Math.min(rect.width - 220, Math.max(8, e.clientX - rect.left + 14)) + 'px';
        tip.style.top = Math.max(8, e.clientY - rect.top - 10) + 'px';
        tip.classList.add('show');
      });
      m.addEventListener('mouseleave', () => tip.classList.remove('show'));
      m.addEventListener('click', () => { focusCamera(cam.id); stageEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    });
  }

  /* ================= KPIs ================= */
  function renderKpis() {
    const cams = PTM.cameras.all();
    const online = cams.filter(c => c.online).length;
    const inc = PTM.incidents.active();
    const agg = wallSims.reduce((a, s) => {
      const st = s.sim.getStats();
      a.v += st.vehicles; a.m += st.motorcycles; return a;
    }, { v: 0, m: 0 });
    const items = [
      { cls: '', label: 'Live cameras', value: U.num(cams.length), sub: 'configured nationwide' },
      { cls: 'green', label: 'Online', value: U.num(online), sub: ((online / cams.length) * 100).toFixed(1) + '% availability' },
      { cls: 'red', label: 'Offline', value: U.num(cams.length - online), sub: 'technician queue' },
      { cls: 'red', label: 'Active incidents', value: U.num(inc.length), sub: PTM.incidents.live().length + ' in last 45 min' },
      { cls: 'gold', label: 'Vehicles detected', value: U.num(8421 + agg.v), sub: 'rolling session total' },
      { cls: 'gold', label: 'Motorcycles', value: U.num(3219 + agg.m), sub: 'boda bodas & bicycles' }
    ];
    document.getElementById('cc-kpis').innerHTML = items.map(i => `
      <div class="kpi ${i.cls}"><div class="kpi-label">${i.label}</div><div class="kpi-value">${i.value}</div><div class="kpi-sub">${i.sub}</div></div>`).join('');
  }

  /* ================= behaviour panel ================= */
  function renderBehavior() {
    const host = document.getElementById('behavior-list');
    const camBadge = document.getElementById('beh-cam');
    if (!focused || !focused.sim) { host.innerHTML = '<div class="empty">Focus a camera to analyse driver behaviour.</div>'; return; }
    camBadge.textContent = focused.cam.id;
    const dets = focused.sim.getDetections().filter(d => d.cls !== 'PERSON').slice(0, 7);
    if (!dets.length) { host.innerHTML = '<div class="empty">No tracked vehicles in frame.</div>'; return; }
    const limit = focused.cam.speedLimit;
    host.innerHTML = dets.map(d => {
      let state, cls;
      if (d.violating) { state = 'VERIFIED VIOLATION'; cls = 'st-verified'; }
      else if (d.speed > limit * 1.12) { state = 'POSSIBLE VIOLATION'; cls = 'st-possible'; }
      else if (d.speed > limit * 0.92) { state = 'CAUTION'; cls = 'st-caution'; }
      else { state = 'SAFE DRIVING'; cls = 'st-safe'; }
      return `<div class="behavior-row">
        <span class="behavior-plate">${U.esc(d.plate || '—')}</span>
        <div style="min-width:0">
          <div class="small" style="font-weight:600">${U.esc(d.cls)}</div>
          <div class="tiny muted-2 mono">${d.speed} km/h · lane ${d.sx < 320 ? 'L' : 'R'} · conf ${d.conf.toFixed(2)}</div>
        </div>
        <span class="behavior-state ${cls}">${state}</span>
      </div>`;
    }).join('');
  }

  /* ================= health panel ================= */
  function renderHealth() {
    const host = document.getElementById('health-list');
    const cams = PTM.cameras.all();
    const online = cams.filter(c => c.online).length;
    const dev = PTM.devices.all();
    const devOn = dev.filter(d => d.online).length;
    const faults = PTM.devices.faults().length;
    const rows = [
      ['Cameras online', `${online}/${cams.length}`, (online / cams.length) * 100, 'green'],
      ['IoT devices online', `${devOn}/${dev.length}`, (devOn / dev.length) * 100, 'green'],
      ['Devices in fault', `${faults}`, Math.min(100, faults * 4), 'red'],
      ['MQTT broker latency', `${18 + Math.floor(Math.random() * 22)} ms`, 22, 'blue'],
      ['Edge AI nodes', `${PTM.devices.byType('EDGE').filter(d => d.online).length}/${PTM.devices.byType('EDGE').length}`, 90, '']
    ];
    host.innerHTML = rows.map(r => `
      <div class="mini-stat" style="display:block">
        <div class="row-between" style="margin-bottom:6px"><span>${r[0]}</span><b>${r[1]}</b></div>
        <div class="bar-track"><div class="bar-fill ${r[3]}" style="width:${U.clamp(r[2], 2, 100)}%"></div></div>
      </div>`).join('');
  }

  /* ================= bottom charts ================= */
  function pushHist() {
    const agg = wallSims.reduce((a, s) => {
      const st = s.sim.getStats();
      a.v += st.vehicles; a.m += st.motorcycles; a.s += st.avgSpeed; a.n++;
      return a;
    }, { v: 0, m: 0, s: 0, n: 0 });
    hist.vpm.push(Math.round(agg.v * 2.4 + Math.random() * 8));
    hist.mpm.push(Math.round(agg.m * 2.1 + Math.random() * 6));
    hist.spd.push(Math.round(agg.n ? agg.s / agg.n : 0));
    ['vpm', 'mpm', 'spd'].forEach(k => { if (hist[k].length > 26) hist[k].shift(); });

    const labels = hist.vpm.map((_, i) => '-' + (hist.vpm.length - 1 - i) * 2 + 's');
    PTM.charts.line('#chart-vpm', { series: [{ name: 'vehicles / min', data: hist.vpm.slice() }], height: 150, labels, colors: ['#ffc93c'] });
    PTM.charts.line('#chart-mpm', { series: [{ name: 'motorcycles / min', data: hist.mpm.slice() }], height: 150, labels, colors: ['#4ee79d'] });
    PTM.charts.line('#chart-spd', { series: [{ name: 'avg km/h', data: hist.spd.slice() }], height: 150, labels, colors: ['#3ba7ff'] });
    document.getElementById('vpm-badge').textContent = (hist.vpm[hist.vpm.length - 1] || 0) + ' /min';
    document.getElementById('mpm-badge').textContent = (hist.mpm[hist.mpm.length - 1] || 0) + ' /min';
    document.getElementById('spd-badge').textContent = (hist.spd[hist.spd.length - 1] || 0) + ' km/h';

    const inc = PTM.incidents.active().length;
    const cams = PTM.cameras.all();
    document.getElementById('cc-bottom-kpis').innerHTML = [
      { label: 'Vehicles / minute', value: hist.vpm[hist.vpm.length - 1] || 0 },
      { label: 'Motorcycles / minute', value: hist.mpm[hist.mpm.length - 1] || 0 },
      { label: 'Average speed', value: (hist.spd[hist.spd.length - 1] || 0) + ' km/h' },
      { label: 'Traffic density', value: Math.round((wallSims.reduce((a, s) => a + s.sim.o.density, 0) / Math.max(1, wallSims.length)) * 100) + '%' },
      { label: 'Active incidents', value: inc },
      { label: 'Cameras online', value: cams.filter(c => c.online).length }
    ].map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join('');
  }

  /* ================= controls ================= */
  document.getElementById('grid-group').addEventListener('click', e => {
    const b = e.target.closest('button[data-grid]');
    if (!b) return;
    grid = +b.dataset.grid;
    document.querySelectorAll('#grid-group button').forEach(x => x.classList.toggle('active', x === b));
    buildWall();
  });

  document.getElementById('wall-shuffle').addEventListener('click', () => { poolOffset += 7; buildWall(); });

  document.getElementById('ai-toggle').addEventListener('change', e => {
    const on = e.target.checked;
    wallSims.forEach(s => s.sim.setOptions({ ai: on }));
    splitSims.forEach(s => s.setOptions({ ai: on }));
    if (focused && focused.sim) focused.sim.setOptions({ ai: on });
    PTM.toast('gold', 'AI overlay ' + (on ? 'enabled' : 'disabled'), on ? 'Computer-vision annotations are drawn on every feed.' : 'Feeds now show raw video only.');
  });

  let searchT = null;
  document.getElementById('cam-search').addEventListener('input', e => {
    clearTimeout(searchT);
    const q = e.target.value;
    searchT = setTimeout(() => {
      filtered = q.trim() ? PTM.cameras.search(q) : null;
      buildWall();
      if (filtered) PTM.toast('gold', filtered.length + ' cameras match', '“' + q + '”');
    }, 260);
  });

  document.getElementById('ptz-pad').addEventListener('click', e => {
    const b = e.target.closest('button[data-ptz]');
    if (!b || !focused || !focused.sim) return;
    if (!focused.cam.online) return;
    const k = b.dataset.ptz;
    if (k === 'reset') { focused.sim.setOptions({ panX: 0, zoom: 1 }); return; }
    const dx = k.includes('l') ? -0.14 : k.includes('r') ? 0.14 : 0;
    const dy = k === 'u' || k === 'ul' || k === 'ur' ? 0.08 : k === 'd' || k === 'dl' || k === 'dr' ? -0.08 : 0;
    focused.sim.nudge(dx, dy);
  });

  document.querySelectorAll('[data-ptz="zoomin"],[data-ptz="zoomout"]').forEach(b => b.addEventListener('click', () => {
    if (!focused || !focused.sim) return;
    focused.sim.nudge(0, b.dataset.ptz === 'zoomin' ? 0.16 : -0.16);
  }));

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageEl.requestFullscreen && stageEl.requestFullscreen();
  });

  document.getElementById('btn-split').addEventListener('click', () => {
    splitOpen = !splitOpen;
    document.getElementById('split-view').style.display = splitOpen ? 'grid' : 'none';
    document.getElementById('btn-split').classList.toggle('btn-outline', splitOpen);
    buildSplit();
  });

  document.getElementById('btn-snapshot').addEventListener('click', () => {
    if (!focused || !focused.sim) { PTM.toast('red', 'No signal', 'The focused camera is offline.'); return; }
    const url = focused.sim.capture(1280, 0.86);
    PTM.audit('SNAPSHOT_CAPTURED', { camId: focused.cam.id });
    PTM.modal({
      title: 'Snapshot — ' + focused.cam.id,
      subtitle: focused.cam.location + ' · ' + U.dateTime(new Date()),
      width: 900,
      body: `<img src="${url}" alt="Snapshot from ${U.esc(focused.cam.id)}" style="width:100%;border-radius:12px;border:1px solid var(--stroke)">
             <p class="tiny muted-2" style="margin-top:12px">Captured from the simulated feed. In production the frame is hashed and written to the evidence vault.</p>`,
      footer: `<a class="btn btn-gold btn-sm" href="${url}" download="${focused.cam.id}-snapshot.jpg">Download frame</a>`
    });
  });

  document.getElementById('btn-record').addEventListener('click', e => {
    recording = !recording;
    e.currentTarget.classList.toggle('btn-danger', recording);
    e.currentTarget.textContent = recording ? 'Stop recording' : 'Record';
    PTM.toast(recording ? 'red' : 'green', recording ? 'Recording started' : 'Recording stopped',
      focused ? focused.cam.id + ' · clip stored in the evidence vault (simulated).' : '');
    if (focused) PTM.audit(recording ? 'RECORDING_STARTED' : 'RECORDING_STOPPED', { camId: focused.cam.id });
  });

  document.getElementById('btn-maploc').addEventListener('click', () => {
    document.getElementById('cc-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (focused) {
      const m = document.querySelector(`#cc-map .map-marker[data-cam="${focused.cam.id}"]`);
      if (m) { m.setAttribute('r', 7); setTimeout(() => m.setAttribute('r', 3), 2200); }
    }
  });

  document.getElementById('btn-report').addEventListener('click', () => {
    if (!focused) return;
    const inc = PTM.incidents.fromEvent({
      type: 'OBSTRUCTION', camId: focused.cam.id, plate: null, vehicleType: null,
      confidence: 1, detail: 'Operator-reported incident', severity: 'warning'
    });
    PTM.toast('gold', 'Incident reported', inc.id + ' created at ' + focused.cam.location + '.');
  });

  /* ================= vehicle search ================= */
  document.getElementById('plate-go').addEventListener('click', doPlateSearch);
  document.getElementById('plate-search').addEventListener('keydown', e => { if (e.key === 'Enter') doPlateSearch(); });

  function doPlateSearch() {
    const q = document.getElementById('plate-search').value.trim();
    if (!q) return;
    const v = PTM.vehicles.find(q);
    const cases = PTM.cases.byPlate(q);
    PTM.audit('VEHICLE_SEARCH', { query: q, hits: cases.length });
    if (!v && !cases.length) {
      PTM.toast('red', 'No records', 'No registered vehicle or case matches “' + q + '”.');
      return;
    }
    const full = PTM.session.can('violations') || PTM.session.can('*');
    PTM.modal({
      title: 'Vehicle record — ' + (v ? v.plate : q.toUpperCase()),
      subtitle: 'Access level: ' + (full ? PTM.roles.label(PTM.session.role()) : 'GUEST (limited)'),
      width: 760,
      body: `
        ${v ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:18px">
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">MAKE / MODEL</div><div class="small" style="margin-top:4px">${U.esc(v.make)} ${U.esc(v.model)}</div></div>
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">COLOUR</div><div class="small" style="margin-top:4px">${U.esc(v.color)}</div></div>
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">CLASS</div><div class="small" style="margin-top:4px">${U.esc(v.class)}</div></div>
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">FIRST REGISTERED</div><div class="small" style="margin-top:4px">${U.esc(v.registered)}</div></div>
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">HOME DISTRICT</div><div class="small" style="margin-top:4px">${U.esc(v.district)}</div></div>
          <div class="glass-soft" style="padding:12px"><div class="tiny muted-2">INSURANCE</div><div class="small" style="margin-top:4px">${v.insurance === 'VALID' ? '<span class="badge badge-online">VALID</span>' : '<span class="badge badge-alert">EXPIRED</span>'}</div></div>
        </div>` : '<div class="notice red" style="margin-bottom:16px">Plate not in the simulated registry, but case records exist.</div>'}
        <div class="panel-title" style="margin-bottom:10px">Case history (${cases.length})</div>
        ${full && cases.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Case</th><th>Violation</th><th>Location</th><th>Date</th><th>Status</th><th>Penalty</th></tr></thead><tbody>
          ${cases.map(c => `<tr><td class="mono">${c.id}</td><td>${U.esc(c.violationLabel)}</td><td>${U.esc(c.location)}</td><td class="mono">${c.date}</td><td><span class="badge ${c.status === 'PAID' ? 'badge-paid' : c.status === 'UNPAID' ? 'badge-unpaid' : 'badge-pending'}">${c.status}</span></td><td class="mono">${U.ugx(c.penalty)}</td></tr>`).join('')}
        </tbody></table></div>`
        : cases.length ? `<div class="notice">Detailed case history is restricted. Sign in with a role that holds the <b>violations</b> permission to view it. ${cases.length} record(s) exist for this plate.</div>`
        : '<div class="empty">No case records for this plate.</div>'}
        <p class="tiny muted-2" style="margin-top:14px">Owner identity is never exposed in this prototype; in production it is released only under lawful authority.</p>`
    });
  }

  /* ================= boot ================= */
  buildMap();
  buildWall();
  const dayish = c => c.online && c.hour > 7.5 && c.hour < 18;
  const firstOnline = PTM.cameras.all().find(c => dayish(c) && c.district === 'Kampala')
    || PTM.cameras.all().find(dayish)
    || PTM.cameras.all().find(c => c.online);
  focusCamera(firstOnline ? firstOnline.id : 'CAM-001');
  renderKpis();
  renderHealth();
  pushHist();

  setInterval(updateStageHud, 700);
  setInterval(renderBehavior, 1400);
  setInterval(renderKpis, 4000);
  setInterval(renderHealth, 6000);
  setInterval(pushHist, 2000);
  setInterval(() => { if (focused && focused.sim) { ring.push({ t: Date.now(), url: focused.sim.capture(360, 0.55) }); if (ring.length > 6) ring.shift(); } }, 1000);
})();
