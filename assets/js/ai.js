/* PTM — AI Detection page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'ai' });

  /* ---------- live inference preview ---------- */
  const cam = PTM.cameras.all().find(c => c.online && c.district === 'Kampala' && c.hour > 7.5 && c.hour < 18) || PTM.cameras.online()[0];
  const sim = new PTMSim(document.getElementById('ai-canvas'), {
    seed: cam.seed, camId: cam.id, location: cam.location, district: cam.district,
    hour: cam.hour, weather: cam.weather, density: Math.max(0.6, cam.density),
    speedLimit: cam.speedLimit, intersection: true, gps: cam.gps,
    quality: 'high', ai: true, aiLabels: true
  });
  sim.start();

  const lanesOn = () => document.getElementById('toggle-lanes').checked;
  document.getElementById('toggle-boxes').addEventListener('change', e => sim.setOptions({ ai: e.target.checked }));
  document.getElementById('toggle-labels').addEventListener('change', e => sim.setOptions({ aiLabels: e.target.checked }));
  document.getElementById('toggle-lanes').addEventListener('change', () => sim.setOptions({ laneGuides: lanesOn() }));

  const detBody = document.getElementById('det-body');
  const fpsEl = document.getElementById('ai-fps');
  setInterval(() => {
    const d = sim.getDetections().slice(0, 9);
    fpsEl.textContent = sim.fps + ' fps · ' + d.length + ' objects tracked';
    detBody.innerHTML = d.length ? d.map(x => `
      <tr>
        <td><span class="badge ${x.violating ? 'badge-violation' : (x.cls === 'PERSON' || x.cls === 'MOTORCYCLE' || x.cls === 'BODA BODA' || x.cls === 'BICYCLE' ? 'badge-gold' : 'badge-online')}">${U.esc(x.cls)}</span></td>
        <td class="mono">${(x.conf || 0.9).toFixed(2)}</td>
        <td class="mono">${x.plate ? U.esc(x.plate) : '<span class="muted-2">—</span>'}</td>
        <td class="mono">${x.speed !== null && x.speed !== undefined ? x.speed + ' km/h' : '<span class="muted-2">—</span>'}</td>
      </tr>`).join('') : '<tr><td colspan="4" class="muted-2 small">Scanning…</td></tr>';
  }, 900);

  /* ---------- detection classes ---------- */
  const CLASSES = [
    ['Cars & taxis', 'Saloon, hatchback and taxi-livery private cars, with drone/white taxi band detection.', 'car'],
    ['Motorcycles & boda bodas', 'Two-wheelers classified separately, including rider count and helmet heuristics.', 'bolt'],
    ['Trucks & heavy vehicles', 'Rigid and articulated freight vehicles with axle-based size estimation.', 'car'],
    ['Buses & matatus', 'Public service vehicles identified by body shape and route livery.', 'car'],
    ['Bicycles', 'Non-motorised two-wheelers tracked in mixed traffic and cycle lanes.', 'bolt'],
    ['Pedestrians', 'Walking persons, crowd density and crossing behaviour near zebra markings.', 'users'],
    ['Traffic signs', 'STOP, yield, no-entry, speed-limit and mandatory-direction signage.', 'alert'],
    ['Traffic lights', 'Signal head state (red/amber/green) synced to stop-line crossing events.', 'bolt'],
    ['Road markings', 'Lane lines, stop lines, zebra crossings and no-parking hatch zones.', 'grid']
  ];
  document.getElementById('classes-grid').innerHTML = CLASSES.map(c => `
    <div class="glass feature card-hover">
      <div class="feature-icon">${PTM.icon(c[2], 20)}</div>
      <h3>${c[0]}</h3>
      <p>${c[1]}</p>
    </div>`).join('');

  /* ---------- ANPR flow ---------- */
  const FLOW = [
    ['Frame capture', 'High-shutter frame grabbed as a vehicle crosses the capture zone.'],
    ['Plate localisation', 'A region-proposal network isolates candidate plate rectangles.'],
    ['Character segmentation', 'The plate region is normalised, de-skewed and split into glyphs.'],
    ['OCR / recognition', 'A CRNN-style recogniser reads glyphs into a plate string.'],
    ['Format validation', 'String checked against Ugandan plate formats (e.g. UAX 123B, UG 1234 A).'],
    ['Register match', 'Plate matched against vehicle register and watchlists over a secure link.'],
    ['Case linkage', 'Recognised plate attached to the detection, evidence frames and any violation.']
  ];
  document.getElementById('anpr-flow').innerHTML = FLOW.map((f, i) => `
    <div class="flow-node">${i + 1}. ${f[0]}<small>${f[1]}</small></div>
    ${i < FLOW.length - 1 ? '<div class="flow-arrow"></div>' : ''}`).join('');

  /* ---------- modules ---------- */
  const MODULES = [
    ['Object detection', 'Locates vehicles, motorcycles, bicycles and pedestrians in every frame.', 'search'],
    ['Classification', 'Assigns each object to a traffic class with a confidence score.', 'grid'],
    ['Multi-object tracking', 'Persistent IDs and motion trails across frames for flow analysis.', 'play'],
    ['ANPR / OCR', 'Reads and validates number plates against Ugandan formats.', 'receipt'],
    ['Speed estimation', 'Ground-plane projection converts pixel displacement to km/h.', 'bolt'],
    ['Behaviour analysis', 'Lane discipline, wrong-side travel, dangerous overtaking, signal compliance.', 'alert'],
    ['Incident detection', 'Collision, stopped-vehicle and obstruction signatures raise alerts.', 'alert'],
    ['Evidence capture', 'Before / during / after frame bundles with timestamps and GPS.', 'cam'],
    ['Analytics engine', 'Aggregates counts, occupancy and violations into reporting series.', 'chart']
  ];
  document.getElementById('modules-grid').innerHTML = MODULES.map(m => `
    <div class="glass feature card-hover">
      <div class="feature-icon">${PTM.icon(m[2], 20)}</div>
      <h3>${m[0]}</h3>
      <p>${m[1]}</p>
    </div>`).join('');

  /* ---------- threshold bars ---------- */
  document.getElementById('threshold-bars').innerHTML = PTM.rules.all().slice(0, 6).map(r => `
    <div style="margin-bottom:11px">
      <div class="row-between small" style="margin-bottom:5px">
        <span class="muted">${U.esc(r.label)}</span>
        <b class="mono">${r.enabled ? (r.confidence * 100).toFixed(0) + '%' : 'disabled'}</b>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${r.enabled ? r.confidence * 100 : 0}%"></div></div>
    </div>`).join('');
})();
