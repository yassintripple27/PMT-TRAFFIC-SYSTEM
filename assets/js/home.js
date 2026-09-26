/* PTM — Home page wiring */
(function () {
  'use strict';
  const U = PTM.util;

  PTM.init({ active: 'home' });

  /* ---------- hero background simulation ---------- */
  function bootHero() {
    const c = document.getElementById('hero-canvas');
    if (!c || !window.PTMSim) return;
    const sim = new PTMSim(c, {
      seed: 4242, camId: 'CAM-001', location: 'Kampala Road', district: 'Kampala',
      hour: 18.35, weather: 'clear', density: 0.66, ai: true, aiLabels: false,
      quality: 'high', speedLimit: 60, gps: '0.3471N, 32.5825E',
      emitEvents: false, jitter: true, zoom: 1.02
    });
    sim.resize();
    sim.start();
    window.addEventListener('resize', () => sim.resize());
  }

  /* ---------- KPI strip ---------- */
  function bootKpis() {
    const host = document.getElementById('home-kpis');
    if (!host) return;
    const cams = PTM.cameras.all();
    const online = cams.filter(c => c.online).length;
    const inc = PTM.incidents.active().length;
    const cases = PTM.cases.all();
    const unpaid = cases.filter(c => c.status === 'UNPAID').length;
    const devices = PTM.devices.online().length;
    const items = [
      { cls: 'gold', label: 'Cameras connected', value: U.num(cams.length), sub: online + ' online · ' + (cams.length - online) + ' offline' },
      { cls: 'green', label: 'IoT devices online', value: U.num(devices), sub: PTM.devices.all().length + ' provisioned' },
      { cls: 'red', label: 'Active incidents', value: U.num(inc), sub: PTM.incidents.live().length + ' in the last 45 min' },
      { cls: '', label: 'Open cases', value: U.num(cases.length), sub: unpaid + ' awaiting payment' },
      { cls: 'blue', label: 'Vehicles detected today', value: '8,421', sub: '3,219 motorcycles' },
      { cls: 'gold', label: 'Districts covered', value: '17', sub: 'Kampala to Arua' }
    ];
    host.innerHTML = items.map(i => `
      <div class="kpi ${i.cls}">
        <div class="kpi-label">${i.label}</div>
        <div class="kpi-value">${i.value}</div>
        <div class="kpi-sub">${i.sub}</div>
      </div>`).join('');
  }

  /* ---------- feature grid ---------- */
  const FEATURES = [
    { icon: 'cam', t: 'Smart Camera Monitoring', d: 'Multi-corridor live video from fixed, dome PTZ and junction multi-sensor units, with day and night IR modes and full CCTV timestamping.' },
    { icon: 'chip', t: 'AI Vehicle Detection', d: 'Continuous computer vision classifies cars, SUVs, pickups, buses, minibuses, trucks, boda bodas, bicycles and pedestrians in every frame.' },
    { icon: 'receipt', t: 'Number Plate Recognition', d: 'Automatic ANPR/OCR captures the plate, vehicle make, colour, time and camera location, then checks it against configured traffic rules.' },
    { icon: 'alert', t: 'Configurable Violation Rules', d: 'Speeding, red-light running, wrong-side driving, dangerous overtaking, illegal parking, U-turns and more — thresholds set by authorised administrators.' },
    { icon: 'shield', t: 'Sealed Evidence Records', d: 'Before / during / after frames plus the video clip are attached to a case ID. Evidence access is role-gated and written to the audit log.' },
    { icon: 'map', t: 'Live Incident Map', d: 'Verified incidents, congestion and police units plotted on a Uganda map so commanders can see national traffic state at a glance.' },
    { icon: 'bolt', t: 'Real-time Police Access', d: 'Officers receive only the incidents inside their jurisdiction and role, with dispatch, live camera hand-off and resolution tracking.' },
    { icon: 'chart', t: 'Traffic Analytics', d: 'Vehicles and motorcycles per hour, congestion, violations by location, accident trends and fine reconciliation across configurable periods.' },
    { icon: 'cog', t: 'Fines & Payments', d: 'Cases move from UNPAID to PAID with a generated receipt number, payment reference, date and time — updated across dashboards instantly.' }
  ];

  function bootFeatures() {
    const host = document.getElementById('feature-grid');
    if (!host) return;
    host.innerHTML = FEATURES.map(f => `
      <div class="feature">
        <div class="feature-icon">${PTM.icon(f.icon, 20)}</div>
        <h3>${f.t}</h3>
        <p>${f.d}</p>
      </div>`).join('');
  }

  /* ---------- workflow flow ---------- */
  const FLOW = [
    ['Open Uganda map', 'Select any connected corridor or junction'],
    ['Select camera', 'Front or rear feed, PTZ controls where the unit supports them'],
    ['Watch live / simulated video', 'Realistic CCTV perspective with timestamp, camera ID and GPS'],
    ['AI detects vehicles', 'Bounding boxes, classes, confidence and tracking IDs'],
    ['AI tracks vehicles', 'Per-object trajectories across the frame'],
    ['AI analyses traffic behaviour', 'Normal, caution, possible violation, verified violation'],
    ['Possible violation detected', 'Above the configured confidence threshold'],
    ['Snapshot + video evidence', 'Full frame, vehicle frame, plate frame and the moment of violation'],
    ['Human verification', 'An authorised officer reviews before any case is opened', true],
    ['Incident created', 'Case ID issued with plate, camera, location and time'],
    ['Authorised police alerted', 'Routed by role and jurisdiction'],
    ['Case / fine process', 'Penalty amount comes from the configured rule set'],
    ['Payment status updated', 'PAID · receipt number and payment reference generated'],
    ['Case closed', 'Audit trail retained', true]
  ];

  function bootFlow() {
    const host = document.getElementById('flow');
    if (!host) return;
    host.innerHTML = FLOW.map((f, i) => `
      ${i ? '<div class="flow-arrow"></div>' : ''}
      <div class="flow-node ${f[2] ? 'gold' : ''}">${U.esc(f[0])}<small>${U.esc(f[1])}</small></div>
    `).join('');
  }

  /* ---------- AI modules ---------- */
  const AI_MODULES = [
    ['Computer Vision', 'Frame-level scene understanding across every connected corridor.'],
    ['Vehicle Detection', 'Classifies light, heavy and vulnerable road users.'],
    ['ANPR / OCR', 'Plate segmentation, character recognition and validation.'],
    ['Object Tracking', 'Stable track IDs and trajectories through occlusion.'],
    ['Traffic Violation Detection', 'Rule engine over tracked motion, lanes and signal state.'],
    ['Video Analytics', 'Flow, density, queue length and journey-time estimation.'],
    ['Incident Detection', 'Collision, obstruction and pedestrian-safety event detection.'],
    ['Traffic Analytics', 'Historical trend and hotspot analysis for planning.'],
    ['AI Alerts', 'Severity-ranked alerts pushed to authorised dashboards.']
  ];

  function bootAI() {
    const host = document.getElementById('ai-modules');
    if (!host) return;
    host.innerHTML = AI_MODULES.map((m, i) => `
      <div class="feature">
        <div class="row-between" style="margin-bottom:14px">
          <div class="feature-icon" style="margin:0">${PTM.icon('chip', 19)}</div>
          <span class="badge badge-gold">MODULE ${String(i + 1).padStart(2, '0')}</span>
        </div>
        <h3>${m[0]}</h3><p>${m[1]}</p>
      </div>`).join('');
  }

  /* ---------- IoT flow ---------- */
  const IOT_FLOW = [
    ['Camera / Sensor', 'ANPR camera · radar · inductive loop · signal head · GPS'],
    ['C-programmed embedded device', 'Capture, pre-filter motion, encode, sign and buffer locally'],
    ['IoT Network', 'MQTT / LoRaWAN over TLS, store-and-forward on link loss'],
    ['PTM Server', 'Ingest, normalise, persist and fan out to subscribers'],
    ['AI Processing', 'Detection, tracking, ANPR, rule evaluation, evidence sealing'],
    ['Police Dashboard', 'Role-scoped real-time view for authorised officers', true]
  ];

  function bootIotFlow() {
    const host = document.getElementById('iot-flow');
    if (!host) return;
    host.innerHTML = IOT_FLOW.map((f, i) => `
      ${i ? '<div class="flow-arrow"></div>' : ''}
      <div class="flow-node ${f[2] ? 'gold' : ''}" style="width:100%">${U.esc(f[0])}<small>${U.esc(f[1])}</small></div>`).join('');
  }

  /* ---------- security grid ---------- */
  const SECURITY = [
    ['lock', 'Secure authentication', 'Officer ID and password with mandatory time-based two-factor verification before any operational view opens.'],
    ['users', 'Role-based permissions', 'Six roles — Super Admin, Traffic Admin, Commander, Police Officer, Payment Officer and System Technician — each limited to authorised data and actions.'],
    ['shield', 'Encrypted data', 'HTTPS/TLS in transit, encrypted evidence at rest, and signed audit records that cannot be silently edited.'],
    ['chart', 'Full audit trail', 'Evidence views, verifications, dismissals, dispatches and payments are all logged with actor, role and timestamp.']
  ];

  function bootSecurity() {
    const host = document.getElementById('security-grid');
    if (!host) return;
    host.innerHTML = SECURITY.map(s => `
      <div class="feature">
        <div class="feature-icon">${PTM.icon(s[0], 20)}</div>
        <h3>${s[1]}</h3><p>${s[2]}</p>
      </div>`).join('');
  }

  /* ---------- map teaser ---------- */
  function bootMapTeaser() {
    const host = document.getElementById('map-teaser');
    if (!host) return;
    const cams = PTM.cameras.all();
    const districts = PTM.cameras.districts();
    const incidents = PTM.incidents.active();

    const markers = districts.map(d => {
      const local = cams.filter(c => c.district === d.city);
      const inc = incidents.filter(i => i.district === d.city);
      const p = PTM.geo.project(d.lon, d.lat);
      const colour = inc.length ? '#ff4d4d' : local.some(c => c.congestion) ? '#ffc93c' : '#24d17d';
      const r = 4 + Math.min(9, local.length * 0.75);
      return `<g class="map-marker" data-city="${d.city}" data-count="${local.length}" data-inc="${inc.length}">
        <circle class="halo" cx="${p.x}" cy="${p.y}" r="6" fill="${colour}" opacity=".5"/>
        <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${colour}" opacity=".22"/>
        <circle cx="${p.x}" cy="${p.y}" r="3.4" fill="${colour}" stroke="#05060a" stroke-width="1.2"/>
        <text x="${p.x}" y="${p.y - r - 6}" fill="#c8cfda" font-size="12" font-family="ui-monospace,monospace" text-anchor="middle">${d.city}</text>
      </g>`;
    }).join('');

    host.innerHTML = `
      <svg viewBox="0 0 1000 700" role="img" aria-label="Map of Uganda showing PTM camera coverage">
        <defs>
          <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#141a26"/><stop offset="100%" stop-color="#0a0e16"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="${PTM.geo.borderPath()}" fill="url(#ug)" stroke="rgba(255,201,60,.55)" stroke-width="2.2" filter="url(#glow)"/>
        ${PTM.geo.lakes().map(l => `<path d="${l.d}" fill="rgba(59,167,255,.2)" stroke="rgba(59,167,255,.34)" stroke-width="1"/>`).join('')}
        ${markers}
      </svg>
      <div class="map-legend">
        <div><i style="background:#24d17d"></i> Cameras online</div>
        <div><i style="background:#ffc93c"></i> Traffic congestion</div>
        <div><i style="background:#ff4d4d"></i> Active incident</div>
        <div><i style="background:#3ba7ff"></i> Police unit</div>
      </div>
      <div class="map-tooltip" id="map-tip"></div>`;

    const tip = document.getElementById('map-tip');
    host.querySelectorAll('.map-marker').forEach(g => {
      g.addEventListener('mouseenter', e => {
        const city = g.dataset.city;
        tip.innerHTML = `<b>${U.esc(city)}</b>
          <div class="tt-row"><span>Cameras</span><span>${g.dataset.count}</span></div>
          <div class="tt-row"><span>Active incidents</span><span>${g.dataset.inc}</span></div>
          <div class="tt-row"><span>Status</span><span>${+g.dataset.inc ? 'ALERT' : 'NOMINAL'}</span></div>`;
        const rect = host.getBoundingClientRect();
        tip.style.left = Math.min(rect.width - 210, e.clientX - rect.left + 14) + 'px';
        tip.style.top = Math.max(8, e.clientY - rect.top - 20) + 'px';
        tip.classList.add('show');
      });
      g.addEventListener('mouseleave', () => tip.classList.remove('show'));
      g.addEventListener('click', () => { location.href = 'map.html?city=' + encodeURIComponent(g.dataset.city); });
    });
  }

  /* ---------- boot ---------- */
  PTM.boot({
    minMs: 2900,
    onDone() {
      bootHero();
      bootKpis();
      bootFeatures();
      bootFlow();
      bootAI();
      bootIotFlow();
      bootSecurity();
      bootMapTeaser();
    }
  });

  // If the loader was skipped, still wire everything up
  if (!document.getElementById('loader')) {
    bootHero(); bootKpis(); bootFeatures(); bootFlow(); bootAI(); bootIotFlow(); bootSecurity(); bootMapTeaser();
  }
})();
