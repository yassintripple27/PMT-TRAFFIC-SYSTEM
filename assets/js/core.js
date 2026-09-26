/* ============================================================
   PTM CORE — navigation, mock data store, geo, charts, UI
   All data in this file is simulated for demonstration.
   ============================================================ */
(function (global) {
  'use strict';

  const PTM = global.PTM = global.PTM || {};

  /* =========================================================
     Small utilities
     ========================================================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, w) => String(n).padStart(w || 2, '0');

  PTM.util = {
    mulberry32, clamp, lerp,
    pick: (r, arr) => arr[Math.floor(r() * arr.length) % arr.length],
    rnd: (r, a, b) => a + r() * (b - a),
    int: (r, a, b) => Math.floor(a + r() * (b - a + 1)),
    now: () => Date.now(),
    stamp(d) {
      d = d || new Date();
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },
    dateStamp(d) {
      d = d || new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    dateTime(d) { return PTM.util.dateStamp(d) + ' ' + PTM.util.stamp(d); },
    ago(ts) {
      const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    },
    num(n) { return Number(n || 0).toLocaleString('en-US'); },
    ugx(n) { return 'UGX ' + Number(n || 0).toLocaleString('en-US'); },
    esc(s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    uid(prefix) { return (prefix || 'ID') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  };
  const U = PTM.util;

  /* =========================================================
     Persistent state (localStorage)
     ========================================================= */
  const LS = {
    get(k, fb) {
      try { const v = localStorage.getItem('ptm.' + k); return v ? JSON.parse(v) : fb; }
      catch (e) { return fb; }
    },
    set(k, v) { try { localStorage.setItem('ptm.' + k, JSON.stringify(v)); } catch (e) { } }
  };
  PTM.store = LS;

  /* =========================================================
     Violation rule catalogue — penalties are CONFIGURABLE
     ========================================================= */
  const DEFAULT_RULES = [
    { key: 'RED_LIGHT', label: 'Red-light violation', enabled: true, severity: 'critical', penalty: 400000, confidence: 0.9, note: 'Crossing the stop line while the signal shows red.' },
    { key: 'SPEED', label: 'Speeding', enabled: true, severity: 'warning', penalty: 300000, confidence: 0.88, note: 'Exceeding the configured zone limit by more than 30%.' },
    { key: 'WRONG_SIDE', label: 'Wrong-side driving', enabled: true, severity: 'critical', penalty: 500000, confidence: 0.86, note: 'Vehicle travelling against the flow of its carriageway.' },
    { key: 'OVERTAKE', label: 'Dangerous overtaking', enabled: true, severity: 'critical', penalty: 450000, confidence: 0.84, note: 'Overtaking across the centre line into oncoming traffic.' },
    { key: 'ILLEGAL_PARKING', label: 'Illegal parking', enabled: true, severity: 'warning', penalty: 150000, confidence: 0.82, note: 'Stationary vehicle inside a marked no-parking zone.' },
    { key: 'ILLEGAL_UTURN', label: 'Illegal U-turn', enabled: true, severity: 'warning', penalty: 200000, confidence: 0.8, note: 'U-turn where prohibited by signage or road marking.' },
    { key: 'INTERSECTION_BLOCK', label: 'Blocking an intersection', enabled: true, severity: 'warning', penalty: 180000, confidence: 0.78, note: 'Entering a junction without a clear exit.' },
    { key: 'SIGN_DISOBEY', label: 'Failure to obey a traffic sign', enabled: true, severity: 'warning', penalty: 160000, confidence: 0.8, note: 'Ignoring STOP / yield / mandatory-direction signage.' },
    { key: 'PEDESTRIAN_ZONE', label: 'Vehicle in a pedestrian zone', enabled: true, severity: 'critical', penalty: 350000, confidence: 0.83, note: 'Motor vehicle or motorcycle inside a restricted pedestrian area.' },
    { key: 'LANE_DISCIPLINE', label: 'Unsafe lane change', enabled: false, severity: 'warning', penalty: 120000, confidence: 0.74, note: 'Lane change without sufficient gap. Disabled — requires human verification.' },
    { key: 'BODA_HELMET', label: 'Motorcycle rider without helmet', enabled: false, severity: 'warning', penalty: 100000, confidence: 0.7, note: 'Disabled by default: AI confidence below enforcement threshold.' }
  ];

  const cloneRules = list => list.map(r => Object.assign({}, r));

  PTM.rules = {
    all() { const stored = LS.get('rules', null); return stored ? cloneRules(stored) : cloneRules(DEFAULT_RULES); },
    save(list) { LS.set('rules', cloneRules(list)); },
    get(key) { return PTM.rules.all().find(r => r.key === key) || cloneRules(DEFAULT_RULES).find(r => r.key === key); },
    reset() { const d = cloneRules(DEFAULT_RULES); LS.set('rules', d); return d; },
    label(key) { const r = PTM.rules.get(key); return r ? r.label : key; },
    penalty(key) { const r = PTM.rules.get(key); return r ? r.penalty : 0; },
    enabled(key) { const r = PTM.rules.get(key); return r ? r.enabled : false; }
  };

  /* =========================================================
     Session / role-based access
     ========================================================= */
  const ROLES = [
    { key: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full control of users, roles, rules, devices, evidence and audit history.', perms: ['*'] },
    { key: 'TRAFFIC_ADMIN', label: 'Traffic Admin', desc: 'Manages traffic zones, detection rules, violations, fines and reports.', perms: ['cameras', 'rules', 'violations', 'fines', 'analytics', 'incidents', 'reports'] },
    { key: 'COMMANDER', label: 'Commander', desc: 'Oversees incidents and units, authorises dispatch and case verification.', perms: ['cameras', 'incidents', 'verify', 'dispatch', 'analytics', 'violations'] },
    { key: 'POLICE_OFFICER', label: 'Police Officer', desc: 'Views assigned incidents, nearby cameras and live traffic for their jurisdiction.', perms: ['cameras', 'incidents', 'live'] },
    { key: 'PAYMENT_OFFICER', label: 'Payment Officer', desc: 'Processes fine payments, issues receipts and reconciles case balances.', perms: ['fines', 'payments', 'receipts'] },
    { key: 'SYSTEM_TECHNICIAN', label: 'System Technician', desc: 'Maintains cameras, IoT devices, network health and edge firmware.', perms: ['iot', 'cameras', 'health'] }
  ];

  PTM.roles = {
    all: () => ROLES,
    get: k => ROLES.find(r => r.key === k),
    label: k => (ROLES.find(r => r.key === k) || {}).label || k
  };

  PTM.session = {
    get() { return LS.get('session', null); },
    set(s) { LS.set('session', s); },
    clear() { LS.set('session', null); },
    user() { const s = PTM.session.get(); return s ? s.user : null; },
    role() { const s = PTM.session.get(); return s ? s.role : null; },
    can(perm) {
      const s = PTM.session.get();
      if (!s) return false;
      const r = PTM.roles.get(s.role);
      if (!r) return false;
      return r.perms.includes('*') || r.perms.includes(perm);
    },
    require(perm, msg) {
      if (PTM.session.can(perm)) return true;
      PTM.toast('red', 'Access denied', msg || 'Your role is not authorised for this action. This attempt has been written to the audit log.');
      PTM.audit('ACCESS_DENIED', { perm: perm || 'unknown', role: PTM.session.role() || 'anonymous' });
      return false;
    }
  };

  /* =========================================================
     Audit log
     ========================================================= */
  PTM.audit = function (action, detail) {
    const log = LS.get('audit', []);
    const s = PTM.session.get();
    log.unshift({
      id: U.uid('AUD'), ts: Date.now(), action,
      actor: s ? s.user.name + ' (' + s.user.officerId + ')' : 'UNAUTHENTICATED',
      role: s ? s.role : 'GUEST',
      detail: detail || {}
    });
    LS.set('audit', log.slice(0, 300));
  };

  /* =========================================================
     GEO — Uganda map projection
     ========================================================= */
  const GEO = {
    lonMin: 29.25, lonMax: 35.25, latMax: 4.55, latMin: -1.75,
    vbW: 1000, vbH: 700, padX: 56, padY: 40,
    project(lon, lat) {
      const x = GEO.padX + ((lon - GEO.lonMin) / (GEO.lonMax - GEO.lonMin)) * (GEO.vbW - GEO.padX * 2);
      const y = GEO.padY + ((GEO.latMax - lat) / (GEO.latMax - GEO.latMin)) * (GEO.vbH - GEO.padY * 2);
      return { x: +x.toFixed(1), y: +y.toFixed(1) };
    }
  };

  // Simplified Uganda border outline (illustrative, not survey-grade)
  const UG_BORDER = [
    [30.83, 3.79], [31.20, 3.86], [31.85, 3.78], [32.35, 3.80], [33.05, 3.96], [33.42, 3.80],
    [34.00, 4.24], [34.48, 3.84], [34.62, 3.28], [35.00, 1.92], [34.58, 1.58], [34.20, 1.10],
    [34.46, 0.60], [34.06, 0.26], [33.92, -0.12], [34.06, -1.06], [33.00, -1.00], [31.80, -1.10],
    [31.00, -1.16], [30.50, -1.10], [29.86, -1.36], [29.57, -1.10], [29.55, -0.58], [29.86, -0.20],
    [30.10, 0.10], [29.84, 0.56], [30.20, 0.86], [30.86, 1.10], [31.16, 1.62], [30.84, 2.20],
    [30.90, 2.86], [30.58, 3.30]
  ];
  const LAKES = {
    victoria: [[31.60, -0.40], [32.20, -0.10], [32.90, 0.05], [33.60, -0.15], [34.00, -0.60], [33.90, -1.05], [33.20, -1.00], [32.40, -0.95], [31.80, -0.90], [31.55, -0.70]],
    albert: [[30.55, 1.15], [30.90, 1.45], [31.10, 1.95], [30.95, 2.30], [30.62, 2.10], [30.42, 1.60]],
    kyoga: [[32.40, 1.30], [33.10, 1.42], [33.60, 1.55], [33.40, 1.78], [32.80, 1.70], [32.35, 1.55]],
    edward: [[29.90, -0.20], [30.20, -0.05], [30.15, 0.30], [29.85, 0.15]],
    george: [[30.20, -0.05], [30.42, 0.02], [30.38, 0.15], [30.18, 0.10]]
  };

  function polyPath(pts) {
    return pts.map((p, i) => {
      const q = GEO.project(p[0], p[1]);
      return (i ? 'L' : 'M') + q.x + ' ' + q.y;
    }).join(' ') + ' Z';
  }

  PTM.geo = {
    GEO,
    borderPath: () => polyPath(UG_BORDER),
    lakePath: name => polyPath(LAKES[name]),
    lakes: () => Object.keys(LAKES).map(k => ({ name: k, d: polyPath(LAKES[k]) })),
    project: (lon, lat) => GEO.project(lon, lat)
  };

  /* =========================================================
     Locations & camera fleet
     ========================================================= */
  const DISTRICTS = [
    { city: 'Kampala', lon: 32.5825, lat: 0.3471, weight: 9 },
    { city: 'Wakiso', lon: 32.4594, lat: 0.4044, weight: 4 },
    { city: 'Mukono', lon: 32.7553, lat: 0.3533, weight: 3 },
    { city: 'Entebbe', lon: 32.4469, lat: 0.0644, weight: 3 },
    { city: 'Jinja', lon: 33.2041, lat: 0.4244, weight: 3 },
    { city: 'Mbarara', lon: 30.6545, lat: -0.6072, weight: 2 },
    { city: 'Mbale', lon: 34.1750, lat: 1.0827, weight: 2 },
    { city: 'Gulu', lon: 32.2990, lat: 2.7747, weight: 2 },
    { city: 'Fort Portal', lon: 30.2750, lat: 0.6700, weight: 2 },
    { city: 'Masaka', lon: 31.7333, lat: -0.3333, weight: 2 },
    { city: 'Arua', lon: 30.9100, lat: 3.0200, weight: 1 },
    { city: 'Kabale', lon: 29.9900, lat: -1.2417, weight: 1 },
    { city: 'Lira', lon: 32.5389, lat: 2.2417, weight: 2 },
    { city: 'Tororo', lon: 34.1819, lat: 0.6931, weight: 1 },
    { city: 'Soroti', lon: 33.6117, lat: 1.7136, weight: 1 },
    { city: 'Hoima', lon: 31.3500, lat: 1.4333, weight: 1 },
    { city: 'Kasese', lon: 30.0833, lat: 0.1833, weight: 1 }
  ];

  const ROADS = {
    Kampala: ['Kampala Road', 'Jinja Road', 'Entebbe Road', 'Northern Bypass', 'Kampala City Centre', 'Ntinda Road', 'Wandegeya Road', 'Kira Road', 'Buganda Road', 'Residential Road — Kololo', 'Owino Market Junction', 'Busega Junction'],
    Wakiso: ['Northern Bypass — Nansana', 'Entebbe Express Link', 'Bulenga Junction'],
    Mukono: ['Mukono Township Road', 'Kampala–Jinja Highway (Mukono)'],
    Entebbe: ['Entebbe Road', 'Entebbe Airport Approach', 'Kitoro Road'],
    Jinja: ['Jinja Road', 'Jinja CBD', 'Jinja–Kampala Highway'],
    Mbarara: ['Mbarara Road', 'Mbarara High Street', 'Mbarara–Kabale Highway'],
    Mbale: ['Mbale Road', 'Mbale Town Centre'],
    Gulu: ['Gulu Road', 'Gulu Town Centre', 'Gulu–Juba Highway'],
    'Fort Portal': ['Fort Portal Road', 'Fort Portal–Kasese Highway'],
    Masaka: ['Masaka Road', 'Masaka Town Centre'],
    Arua: ['Arua Road', 'Arua Town Centre'],
    Kabale: ['Kabale Road', 'Kabale Town Centre'],
    Lira: ['Lira Road', 'Lira Town Centre'],
    Tororo: ['Tororo Road', 'Tororo Town Centre'],
    Soroti: ['Soroti Road', 'Soroti Town Centre'],
    Hoima: ['Hoima Road', 'Hoima Town Centre'],
    Kasese: ['Kasese Road', 'Kasese Town Centre']
  };

  const CAM_TYPES = ['ANPR Camera', 'Dome PTZ Camera', 'Fixed Traffic Camera', 'Corridor Speed Camera', 'Junction Multi-Sensor', 'Pedestrian Zone Camera'];
  const WEATHERS = ['clear', 'clear', 'clear', 'rain', 'fog', 'clear', 'rain'];

  const FLEET_TOTAL = 248;
  const FLEET_OFFLINE = 17;

  function buildCameras() {
    const r = mulberry32(20260921);
    const totalWeight = DISTRICTS.reduce((s, d) => s + d.weight, 0);

    // proportional per-district quota (largest remainder) so the whole country is covered
    const exact = DISTRICTS.map(d => d.weight * FLEET_TOTAL / totalWeight);
    const quota = exact.map(Math.floor);
    let assigned = quota.reduce((s, x) => s + x, 0);
    const byRemainder = DISTRICTS.map((_, i) => i).sort((a, b) => (exact[b] - quota[b]) - (exact[a] - quota[a]));
    for (let i = 0; assigned < FLEET_TOTAL; i++) { quota[byRemainder[i % byRemainder.length]]++; assigned++; }

    // round-robin generation: one camera per district each pass, so CAM ids interleave geographically
    const cams = [];
    const made = DISTRICTS.map(() => 0);
    let n = 0;
    let remaining = FLEET_TOTAL, guard = 0;
    while (remaining > 0 && guard++ < 100000) {
      for (let di = 0; di < DISTRICTS.length && remaining > 0; di++) {
        if (made[di] >= quota[di]) continue;
        const d = DISTRICTS[di];
        const i = made[di]++;
        remaining--; n++;
        const roads = ROADS[d.city] || [d.city + ' Road'];
        const road = roads[i % roads.length];
        const k = i % 3;
        const lon = d.lon + (r() - 0.5) * 0.075;
        const lat = d.lat + (r() - 0.5) * 0.068;
        const hourBucket = r();
        cams.push({
          id: 'CAM-' + pad(n, 3),
          road,
          location: road + (k === 1 ? ' — North' : k === 2 ? ' — South' : ''),
          district: d.city,
          lon, lat,
          gps: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(4)}°E`,
          type: U.pick(r, CAM_TYPES),
          online: true,
          congestion: r() < 0.16,
          density: clamp(0.28 + r() * 0.72, 0.2, 1),
          weather: U.pick(r, WEATHERS),
          hour: hourBucket < 0.2 ? U.rnd(r, 6.2, 8.4) : hourBucket < 0.42 ? U.rnd(r, 11, 14) : hourBucket < 0.72 ? U.rnd(r, 16.6, 19.2) : U.rnd(r, 19.6, 23.4),
          speedLimit: U.pick(r, [40, 50, 60, 80]),
          seed: n * 7919 + 13,
          anpr: r() > 0.12,
          pedestrianZone: road.toLowerCase().includes('residential') || road.toLowerCase().includes('market') || road.toLowerCase().includes('cbd'),
          intersection: r() > 0.3,
          installed: `${2019 + Math.floor(r() * 6)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`,
          firmware: 'v' + U.pick(r, ['2.4.1', '2.4.3', '2.5.0', '2.6.2']),
          lastPing: Date.now() - Math.floor(r() * 40000)
        });
      }
    }

    // deterministic offline set — exactly FLEET_OFFLINE units, spread across the fleet
    const offIdx = new Set();
    while (offIdx.size < FLEET_OFFLINE) offIdx.add(Math.floor(r() * cams.length));
    offIdx.forEach(idx => {
      cams[idx].online = false;
      cams[idx].congestion = false;
      cams[idx].lastPing = Date.now() - Math.floor(r() * 9000000);
    });

    return cams;
  }

  const CAMERAS = buildCameras();
  PTM.cameras = {
    all: () => CAMERAS,
    get: id => CAMERAS.find(c => c.id === id),
    online: () => CAMERAS.filter(c => c.online),
    offline: () => CAMERAS.filter(c => !c.online),
    byDistrict: d => CAMERAS.filter(c => c.district === d),
    districts: () => DISTRICTS,
    search(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) return CAMERAS;
      return CAMERAS.filter(c =>
        c.id.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) || c.road.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) || (c.online ? 'online' : 'offline').includes(q)
      );
    },
    pickFeatured(count) {
      const want = ['CAM-001', 'CAM-002', 'CAM-003', 'CAM-004', 'CAM-005'];
      const out = want.map(id => CAMERAS.find(c => c.id === id)).filter(Boolean);
      const rest = CAMERAS.filter(c => c.online && !out.includes(c));
      let i = 0;
      while (out.length < count && i < rest.length) out.push(rest[i++]);
      return out.slice(0, count);
    }
  };

  /* =========================================================
     Vehicles registry (for plate search)
     ========================================================= */
  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  function buildVehicles() {
    const r = mulberry32(771);
    const makes = [
      ['Toyota', 'Premio', 'White'], ['Toyota', 'Harrier', 'Black'], ['Toyota', 'Hiace', 'White'],
      ['Toyota', 'Corolla', 'Silver'], ['Toyota', 'Land Cruiser', 'Dark Grey'], ['Nissan', 'X-Trail', 'Silver'],
      ['Nissan', 'Wingroad', 'White'], ['Mitsubishi', 'Pajero', 'Green'], ['Isuzu', 'Elf Truck', 'Blue'],
      ['Subaru', 'Forester', 'Maroon'], ['Mercedes-Benz', 'C200', 'Black'], ['Mazda', 'Demio', 'Red'],
      ['Honda', 'Fit', 'Grey'], ['Yamaha', 'Boxer 100', 'Red'], ['Bajaj', 'Pulsar', 'Black'],
      ['Tvs', 'Apache', 'Blue'], ['Volvo', 'Bus', 'White'], ['Scania', 'Bus', 'Yellow']
    ];
    const out = [];
    for (let i = 0; i < 180; i++) {
      const m = U.pick(r, makes);
      const plate = 'U' + LETTERS[Math.floor(r() * 23)] + LETTERS[Math.floor(r() * 23)] + ' ' + U.int(r, 100, 999) + LETTERS[Math.floor(r() * 23)];
      out.push({
        plate, make: m[0], model: m[1], color: m[2],
        class: /Yamaha|Bajaj|Tvs/.test(m[0]) ? 'MOTORCYCLE' : /Bus|Truck|Elf/.test(m[0] + m[1]) ? 'HEAVY' : 'LIGHT',
        registered: `${2015 + Math.floor(r() * 11)}`,
        owner: 'REDACTED — access restricted by role',
        district: U.pick(r, DISTRICTS).city,
        insurance: r() > 0.22 ? 'VALID' : 'EXPIRED',
        seed: Math.floor(r() * 99999) + 3
      });
    }
    return out;
  }
  const VEHICLES = buildVehicles();
  PTM.vehicles = {
    all: () => VEHICLES,
    find(plate) { return VEHICLES.find(v => v.plate.replace(/\s/g, '').toLowerCase() === String(plate || '').replace(/\s/g, '').toLowerCase()); },
    random(r) { return U.pick(r || Math.random, VEHICLES); },
    randomPlate(r) {
      r = r || Math.random;
      return 'U' + LETTERS[Math.floor(r() * 23)] + LETTERS[Math.floor(r() * 23)] + ' ' + U.int(r, 100, 999) + LETTERS[Math.floor(r() * 23)];
    }
  };

  /* =========================================================
     Cases / violations / fines
     ========================================================= */
  function buildCases() {
    const r = mulberry32(4242);
    const rules = DEFAULT_RULES.filter(x => x.enabled);
    const cases = [];
    for (let i = 0; i < 62; i++) {
      const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
      const rule = rules[Math.floor(r() * rules.length)];
      const veh = VEHICLES[Math.floor(r() * VEHICLES.length)];
      const ts = Date.now() - Math.floor(r() * 1000 * 60 * 60 * 24 * 26);
      const d = new Date(ts);
      const roll = r();
      const status = roll < 0.34 ? 'PAID' : roll < 0.62 ? 'UNPAID' : roll < 0.82 ? 'PENDING VERIFICATION' : 'RESOLVED';
      cases.push({
        id: 'PTM-2026-' + pad(100 + i, 6),
        camId: cam.id, location: cam.location, district: cam.district, gps: cam.gps,
        plate: veh.plate, make: veh.make, model: veh.model, color: veh.color,
        vehicleType: veh.class === 'MOTORCYCLE' ? 'MOTORCYCLE' : veh.class === 'HEAVY' ? 'TRUCK/BUS' : 'CAR',
        violation: rule.key, violationLabel: rule.label,
        severity: rule.severity,
        ts, date: U.dateStamp(d), time: U.stamp(d),
        speed: Math.round(U.rnd(r, 42, 118)),
        speedLimit: cam.speedLimit,
        confidence: +U.rnd(r, rule.confidence, 0.995).toFixed(3),
        status,
        penalty: rule.penalty,
        verifiedBy: status === 'PENDING VERIFICATION' ? null : U.pick(r, ['Ofc. R. Nakato', 'Sgt. D. Okello', 'Insp. A. Mugisha', 'Ofc. J. Babirye', 'Sgt. P. Auma']),
        evidenceFrames: 5,
        seed: Math.floor(r() * 99999) + 11,
        hour: d.getHours() + d.getMinutes() / 60
      });
    }
    // merge any user-side status changes
    const payments = LS.get('payments', {});
    for (const c of cases) {
      const p = payments[c.id];
      if (!p) continue;
      c.payment = p;
      c.status = p.status === 'PAID' ? 'PAID' : p.status === 'PENDING APPROVAL' ? 'PAYMENT PENDING' : 'UNPAID';
    }
    cases.sort((a, b) => b.ts - a.ts);
    return cases;
  }

  let CASES = buildCases();
  PTM.cases = {
    all: () => CASES,
    get: id => CASES.find(c => c.id === id),
    byPlate: p => CASES.filter(c => c.plate.replace(/\s/g, '').toLowerCase() === String(p).replace(/\s/g, '').toLowerCase()),
    refresh() { CASES = buildCases(); return CASES; },
    unpaid: () => CASES.filter(c => c.status === 'UNPAID'),
    pending: () => CASES.filter(c => c.status === 'PENDING VERIFICATION'),
    paid: () => CASES.filter(c => c.status === 'PAID'),
    verify(id, officer) {
      const c = PTM.cases.get(id);
      if (!c) return null;
      c.status = 'UNPAID';
      c.verifiedBy = officer || 'Commander';
      c.verifiedAt = Date.now();
      PTM.audit('CASE_VERIFIED', { caseId: id, officer: c.verifiedBy });
      return c;
    },
    reject(id, reason) {
      const c = PTM.cases.get(id);
      if (!c) return null;
      c.status = 'DISMISSED';
      c.rejectReason = reason || 'AI confidence below enforcement threshold';
      PTM.audit('CASE_DISMISSED', { caseId: id, reason: c.rejectReason });
      return c;
    },
    pay(id, method, reference) {
      const c = PTM.cases.get(id);
      if (!c) return null;
      const payments = LS.get('payments', {});
      const rec = {
        status: 'PENDING APPROVAL',
        receipt: null,
        reference: reference || 'REF-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        method: method || 'MTN MOBILE MONEY',
        amount: c.penalty,
        plate: c.plate,
        caseId: c.id,
        ts: Date.now(),
        date: U.dateStamp(new Date()),
        time: U.stamp(new Date())
      };
      payments[c.id] = rec;
      LS.set('payments', payments);
      c.status = 'PAYMENT PENDING';
      c.payment = rec;
      PTM.audit('PAYMENT_SUBMITTED', { caseId: c.id, amount: c.penalty, method: rec.method, reference: rec.reference });
      return rec;
    },
    approvePayment(id) {
      const c = PTM.cases.get(id);
      const payments = LS.get('payments', {});
      const rec = payments[id];
      if (!c || !rec || rec.status !== 'PENDING APPROVAL') return null;
      const u = PTM.session.user();
      rec.status = 'PAID';
      rec.receipt = 'PTM-RCP-' + pad(Math.floor(Math.random() * 899999) + 100000, 6);
      rec.approvedBy = u ? u.name : 'Payment Officer';
      rec.approvedAt = Date.now();
      LS.set('payments', payments);
      c.status = 'PAID';
      c.payment = rec;
      PTM.audit('PAYMENT_APPROVED', { caseId: id, receipt: rec.receipt, method: rec.method, amount: rec.amount });
      return rec;
    },
    rejectPayment(id, reason) {
      const c = PTM.cases.get(id);
      const payments = LS.get('payments', {});
      const rec = payments[id];
      if (!c || !rec || rec.status !== 'PENDING APPROVAL') return null;
      const u = PTM.session.user();
      rec.status = 'REJECTED';
      rec.rejectReason = reason || 'Payment could not be reconciled';
      rec.reviewedBy = u ? u.name : 'Payment Officer';
      LS.set('payments', payments);
      c.status = 'UNPAID';
      c.payment = rec;
      PTM.audit('PAYMENT_REJECTED', { caseId: id, method: rec.method, reason: rec.rejectReason });
      return rec;
    },
    awaitingApproval: () => CASES.filter(c => c.payment && c.payment.status === 'PENDING APPROVAL'),
    payments: () => LS.get('payments', {})
  };

  /* =========================================================
     Live incidents (in-memory, grows over the session)
     ========================================================= */
  const INCIDENT_TYPES = [
    { key: 'ACCIDENT', label: 'Road traffic accident', sev: 'critical' },
    { key: 'VIOLATION', label: 'Traffic violation', sev: 'critical' },
    { key: 'CONGESTION', label: 'Traffic congestion', sev: 'warning' },
    { key: 'OBSTRUCTION', label: 'Road obstruction', sev: 'warning' },
    { key: 'EMERGENCY', label: 'Emergency / ambulance corridor', sev: 'critical' },
    { key: 'PEDESTRIAN', label: 'Pedestrian safety alert', sev: 'warning' },
    { key: 'SIGNAL_FAULT', label: 'Traffic signal fault', sev: 'info' },
    { key: 'DEVICE', label: 'Camera offline', sev: 'info' }
  ];

  function buildIncidents() {
    const r = mulberry32(31337);
    const out = [];
    for (let i = 0; i < 34; i++) {
      const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
      const t = INCIDENT_TYPES[Math.floor(r() * INCIDENT_TYPES.length)];
      const ts = Date.now() - Math.floor(r() * 1000 * 60 * 240);
      const roll = r();
      out.push({
        id: (t.key === 'ACCIDENT' ? 'PTM-ACC-' : 'PTM-INC-') + pad(1000 + i * 3 + Math.floor(r() * 3), 5),
        type: t.key, typeLabel: t.label, severity: t.sev,
        camId: cam.id, location: cam.location, district: cam.district, gps: cam.gps,
        lon: cam.lon, lat: cam.lat,
        ts, plate: t.key === 'VIOLATION' || t.key === 'ACCIDENT' ? PTM.vehicles.randomPlate(r) : null,
        units: Math.floor(r() * 3),
        status: roll < 0.3 ? 'RESPONDING' : roll < 0.52 ? 'ON SCENE' : roll < 0.74 ? 'PENDING VERIFICATION' : 'RESOLVED',
        assignedUnit: roll < 0.6 ? 'UNIT PTM-' + pad(U.int(r, 1, 60), 3) : null,
        distanceKm: +U.rnd(r, 0.4, 6.5).toFixed(1),
        seed: Math.floor(r() * 99999) + 5
      });
    }
    out.sort((a, b) => b.ts - a.ts);
    // newest 24 stay active, older ones resolved — matches the fleet KPI headline
    out.forEach((inc, idx) => {
      if (idx < 24) {
        const m = idx % 3;
        inc.status = m === 0 ? 'RESPONDING' : m === 1 ? 'ON SCENE' : 'PENDING VERIFICATION';
        if (!inc.assignedUnit && m !== 2) inc.assignedUnit = 'UNIT PTM-' + pad(1 + (idx * 7) % 60, 3);
      } else {
        inc.status = 'RESOLVED';
      }
    });
    return out;
  }

  const INCIDENTS = buildIncidents();
  PTM.incidents = {
    all: () => INCIDENTS,
    types: () => INCIDENT_TYPES,
    get: id => INCIDENTS.find(i => i.id === id),
    active: () => INCIDENTS.filter(i => i.status !== 'RESOLVED'),
    live: () => INCIDENTS.filter(i => Date.now() - i.ts < 1000 * 60 * 45 && i.status !== 'RESOLVED'),
    push(inc) {
      INCIDENTS.unshift(inc);
      if (INCIDENTS.length > 220) INCIDENTS.pop();
      return inc;
    },
    setStatus(id, status, extra) {
      const i = PTM.incidents.get(id);
      if (!i) return null;
      i.status = status;
      Object.assign(i, extra || {});
      PTM.audit('INCIDENT_' + status.replace(/\s+/g, '_').toUpperCase(), { incidentId: id });
      return i;
    },
    dispatch(id, unit) {
      const i = PTM.incidents.get(id);
      if (!i) return null;
      i.status = 'RESPONDING';
      i.assignedUnit = unit || 'UNIT PTM-' + pad(Math.floor(Math.random() * 60) + 1, 3);
      i.dispatchedAt = Date.now();
      PTM.audit('OFFICER_DISPATCHED', { incidentId: id, unit: i.assignedUnit });
      return i;
    },
    fromEvent(ev) {
      const cam = PTM.cameras.get(ev.camId) || CAMERAS[0];
      const typeMap = { COLLISION: 'ACCIDENT', RED_LIGHT: 'VIOLATION', SPEED: 'VIOLATION', WRONG_SIDE: 'VIOLATION', OVERTAKE: 'VIOLATION', PEDESTRIAN: 'PEDESTRIAN' };
      const key = typeMap[ev.type] || 'VIOLATION';
      const t = INCIDENT_TYPES.find(x => x.key === key) || INCIDENT_TYPES[1];
      return PTM.incidents.push({
        id: (key === 'ACCIDENT' ? 'PTM-ACC-' : 'PTM-INC-') + pad(Math.floor(Math.random() * 89999) + 10000, 5),
        type: t.key, typeLabel: t.label, severity: t.sev,
        camId: cam.id, location: cam.location, district: cam.district, gps: cam.gps,
        lon: cam.lon, lat: cam.lat, ts: Date.now(),
        plate: ev.plate, vehicleType: ev.vehicleType, speed: ev.speed,
        confidence: ev.confidence, detail: ev.detail, violation: ev.type,
        status: 'PENDING VERIFICATION', units: 0, seed: Math.floor(Math.random() * 99999) + 5
      });
    }
  };

  /* =========================================================
     IoT devices
     ========================================================= */
  const DEVICE_TYPES = [
    { key: 'CAMERA', label: 'Smart Traffic Camera', icon: 'cam', proto: 'MQTT / TLS' },
    { key: 'SPEED', label: 'Radar Speed Sensor', icon: 'radar', proto: 'MQTT' },
    { key: 'SIGNAL', label: 'Traffic Light Sensor', icon: 'signal', proto: 'Modbus → MQTT' },
    { key: 'GPS', label: 'Vehicle GPS Unit', icon: 'gps', proto: 'MQTT' },
    { key: 'ROAD', label: 'Road Surface Sensor', icon: 'road', proto: 'LoRaWAN' },
    { key: 'EDGE', label: 'Edge AI Compute Node', icon: 'chip', proto: 'gRPC / TLS' },
    { key: 'WEATHER', label: 'Weather Station', icon: 'cloud', proto: 'MQTT' }
  ];

  function buildDevices() {
    const r = mulberry32(9091);
    const out = [];
    let n = 0;
    for (const dt of DEVICE_TYPES) {
      const count = dt.key === 'CAMERA' ? 60 : dt.key === 'GPS' ? 34 : 22;
      for (let i = 0; i < count; i++) {
        n++;
        const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
        const online = r() > (dt.key === 'CAMERA' ? 0.07 : 0.11);
        out.push({
          id: dt.key.slice(0, 3) + '-' + pad(n, 4),
          type: dt.key, label: dt.label, proto: dt.proto,
          district: cam.district, location: cam.location, lon: cam.lon, lat: cam.lat,
          online,
          battery: dt.key === 'GPS' || dt.key === 'ROAD' ? U.int(r, 18, 100) : null,
          power: U.pick(r, ['GRID', 'GRID', 'SOLAR + BATTERY', 'GRID']),
          firmware: 'fw-' + U.pick(r, ['1.8.2', '1.9.0', '2.0.4', '2.1.1']),
          lastPing: Date.now() - Math.floor(r() * (online ? 90000 : 26000000)),
          uptime: +(90 + r() * 9.9).toFixed(2),
          txRate: U.int(r, 1, 30),
          health: online ? (r() > 0.86 ? 'DEGRADED' : 'HEALTHY') : 'FAULT',
          lang: dt.key === 'EDGE' || dt.key === 'CAMERA' ? 'C / C++ (embedded)' : 'C (firmware)'
        });
      }
    }
    return out;
  }
  const DEVICES = buildDevices();
  PTM.devices = {
    all: () => DEVICES,
    types: () => DEVICE_TYPES,
    online: () => DEVICES.filter(d => d.online),
    byType: t => DEVICES.filter(d => d.type === t),
    faults: () => DEVICES.filter(d => !d.online || d.health === 'FAULT' || d.health === 'DEGRADED')
  };

  /* =========================================================
     Users
     ========================================================= */
  function buildUsers() {
    const r = mulberry32(5150);
    const names = [
      ['Rachel Nakato', 'POLICE_OFFICER', 'Kampala Central'], ['David Okello', 'COMMANDER', 'Gulu'],
      ['Aisha Mugisha', 'TRAFFIC_ADMIN', 'Kampala'], ['Joseph Babirye', 'POLICE_OFFICER', 'Jinja'],
      ['Patience Auma', 'PAYMENT_OFFICER', 'Mbarara'], ['Samuel Kibirige', 'SYSTEM_TECHNICIAN', 'National'],
      ['Grace Adongo', 'POLICE_OFFICER', 'Mbale'], ['Ivan Ssebaggala', 'COMMANDER', 'Kampala'],
      ['Miriam Kyomuhendo', 'TRAFFIC_ADMIN', 'Fort Portal'], ['Peter Ochom', 'SYSTEM_TECHNICIAN', 'Lira'],
      ['Florence Namutebi', 'PAYMENT_OFFICER', 'Masaka'], ['Brian Wasswa', 'SUPER_ADMIN', 'National'],
      ['Sarah Akello', 'POLICE_OFFICER', 'Arua'], ['Moses Rutaro', 'POLICE_OFFICER', 'Kabale'],
      ['Diana Birungi', 'COMMANDER', 'Mbarara'], ['Hassan Kato', 'SYSTEM_TECHNICIAN', 'Kampala']
    ];
    return names.map((nm, i) => ({
      id: 'PTM-U-' + pad(i + 1, 3),
      name: nm[0],
      officerId: 'OF-' + pad(2000 + i * 37, 5),
      role: nm[1],
      station: nm[2],
      active: r() > 0.12,
      twoFA: r() > 0.18,
      lastLogin: Date.now() - Math.floor(r() * 1000 * 60 * 60 * 90),
      created: `${2021 + Math.floor(r() * 5)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`
    }));
  }
  const USERS = buildUsers();
  PTM.users = {
    all: () => USERS,
    get: id => USERS.find(u => u.id === id),
    byRole: r => USERS.filter(u => u.role === r),
    authenticate(officerId, password, otp) {
      const u = USERS.find(x => x.officerId.toLowerCase() === String(officerId || '').toLowerCase());
      if (!u || !u.active) return { ok: false, error: 'Officer ID not recognised or account deactivated.' };
      if (!password || password.length < 4) return { ok: false, error: 'Password is required (demo accepts any 4+ characters).' };
      if (!/^\d{6}$/.test(String(otp || ''))) return { ok: false, error: 'Enter the 6-digit code from your authenticator app.' };
      if (String(otp) !== '000000' && String(otp).slice(0, 3) !== '246') {
        return { ok: false, error: 'Second factor rejected. For this demo use 000000 or any code starting 246.' };
      }
      return { ok: true, user: u };
    }
  };

  /* =========================================================
     Analytics series generator
     ========================================================= */
  PTM.analytics = {
    series(seed, n, base, amp, noise) {
      const r = mulberry32(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const wave = Math.sin((i / n) * Math.PI * 2) * amp;
        const daily = Math.sin((i % 24) / 24 * Math.PI * 2 - 1.2) * amp * 0.6;
        out.push(Math.max(0, Math.round(base + wave + daily + (r() - 0.5) * noise)));
      }
      return out;
    },
    hourlyTraffic(seed) {
      const r = mulberry32(seed);
      return Array.from({ length: 24 }, (_, h) => {
        const peak = Math.exp(-Math.pow(h - 8.2, 2) / 5.5) + Math.exp(-Math.pow(h - 18.4, 2) / 6.2) * 1.15;
        return Math.round(60 + peak * 780 + r() * 70);
      });
    },
    hourlyBoda(seed) {
      const r = mulberry32(seed + 9);
      return Array.from({ length: 24 }, (_, h) => {
        const peak = Math.exp(-Math.pow(h - 9, 2) / 8) + Math.exp(-Math.pow(h - 19, 2) / 7) * 1.3;
        return Math.round(40 + peak * 620 + r() * 60);
      });
    },
    violationsByLocation(seed) {
      const r = mulberry32(seed);
      return DISTRICTS.slice(0, 9).map(d => ({
        label: d.city,
        value: Math.round((d.weight + 1) * (60 + r() * 260))
      })).sort((a, b) => b.value - a.value);
    },
    violationsByType(seed) {
      const r = mulberry32(seed);
      return DEFAULT_RULES.slice(0, 8).map(x => ({ label: x.label, value: Math.round(40 + r() * 640) }));
    }
  };

  /* =========================================================
     Navigation
     ========================================================= */
  const NAV = [
    { href: 'index.html', key: 'home', label: 'Home' },
    { href: 'command-center.html', key: 'command', label: 'Command Center' },
    { href: 'cameras.html', key: 'cameras', label: 'Live Cameras' },
    { href: 'ai-detection.html', key: 'ai', label: 'AI Detection' },
    { href: 'violations.html', key: 'violations', label: 'Violations' },
    { href: 'fines.html', key: 'fines', label: 'Fines & Payments' },
    { href: 'map.html', key: 'map', label: 'Uganda Map' },
    { href: 'iot.html', key: 'iot', label: 'IoT' },
    { href: 'analytics.html', key: 'analytics', label: 'Analytics' },
    { href: 'police.html', key: 'police', label: 'Police' },
    { href: 'admin.html', key: 'admin', label: 'Admin' }
  ];
  PTM.NAV = NAV;

  const ICONS = {
    shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z"/>',
    cam: '<path d="M4 7h11v10H4z"/><path d="M15 10l5-3v10l-5-3z"/>',
    bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    map: '<path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2zm0 2.5l6 2v11l-6-2v-11z"/>',
    chart: '<path d="M4 20h16v1.5H4zM6 10h3v8H6zm5-6h3v14h-3zm5 9h3v5h-3z"/>',
    lock: '<path d="M7 10V7a5 5 0 0110 0v3h1v10H6V10h1zm2 0h6V7a3 3 0 10-6 0v3z"/>',
    users: '<path d="M8 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm8 .5a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6H2zm14.5-5.2c2.6.5 4.5 2.8 4.5 5.2h-4c0-1.7-.6-3.3-1.6-4.5.35-.05.7-.1 1.1-.1z"/>',
    cog: '<path d="M12 8.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5zM19.4 13l2 1.6-2 3.4-2.4-1a7.5 7.5 0 01-1.8 1l-.4 2.5h-4l-.4-2.5a7.5 7.5 0 01-1.8-1l-2.4 1-2-3.4L4.6 13a7.6 7.6 0 010-2L2.6 9.4l2-3.4 2.4 1a7.5 7.5 0 011.8-1L9.2 3.5h4l.4 2.5c.65.28 1.26.62 1.8 1l2.4-1 2 3.4-2 1.6c.07.32.1.66.1 1s-.03.68-.1 1z"/>',
    alert: '<path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    search: '<path d="M10 4a6 6 0 105.2 9l4.3 4.3 1.4-1.4L16.6 11.6A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z"/>',
    grid: '<path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>',
    chip: '<path d="M9 3v2H7a2 2 0 00-2 2v2H3v2h2v2H3v2h2v2a2 2 0 002 2h2v2h2v-2h2v2h2v-2h2a2 2 0 002-2v-2h2v-2h-2v-2h2V9h-2V7a2 2 0 00-2-2h-2V3h-2v2h-2V3H9zm-2 6h10v6H7V9zm2 2v2h6v-2H9z"/>',
    car: '<path d="M5 11l1.6-4.4A2 2 0 018.5 5h7a2 2 0 011.9 1.6L19 11h1v6h-2v2h-2v-2H8v2H6v-2H4v-6h1zm2.2 0h9.6l-1.2-3.5a1 1 0 00-.9-.6H8.3a1 1 0 00-.9.6L6.2 11zM7 13a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z"/>',
    receipt: '<path d="M6 2l2 1.5L10 2l2 1.5L14 2l2 1.5L18 2v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22V2zm2 6v2h8V8H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z"/>',
    cloud: '<path d="M6.5 19a4.5 4.5 0 01-.42-8.98 6 6 0 0111.7-1.1A4.75 4.75 0 0117.25 19H6.5z"/>'
  };
  PTM.icon = function (name, size) {
    const d = ICONS[name] || ICONS.shield;
    return `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="currentColor" aria-hidden="true">${d}</svg>`;
  };

  PTM.mountNav = function (active) {
    const mount = document.getElementById('nav-mount');
    if (!mount) return;
    const sess = PTM.session.get();
    const who = sess
      ? `<span class="badge badge-gold" title="Signed in">${PTM.icon('lock', 12)}<span class="mono">${U.esc(sess.user.officerId)}</span></span>`
      : `<a class="btn btn-outline btn-sm" href="police.html">${PTM.icon('lock', 13)} Sign in</a>`;

    mount.className = 'topnav';
    mount.innerHTML = `
      <div class="wrap-wide">
        <a class="brand" href="index.html">
          <span class="brand-mark">PTM</span>
          <span class="brand-text">
            <span class="brand-name">PTM</span>
            <span class="brand-sub">Police Traffic Management</span>
          </span>
        </a>
        <nav class="nav-links" id="nav-links">
          ${NAV.map(n => `<a class="nav-link${n.key === active ? ' active' : ''}" href="${n.href}">${n.label}</a>`).join('')}
        </nav>
        <div class="nav-right">
          <span class="nav-clock mono" id="nav-clock">--:--:--</span>
          ${who}
          <button class="btn btn-icon btn-ghost hamburger" id="nav-burger" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
          </button>
        </div>
      </div>`;

    const burger = document.getElementById('nav-burger');
    const links = document.getElementById('nav-links');
    if (burger && links) burger.addEventListener('click', () => links.classList.toggle('open'));

    PTM.startClock(document.getElementById('nav-clock'));
  };

  PTM.mountFooter = function () {
    const mount = document.getElementById('footer-mount');
    if (!mount) return;
    mount.className = 'footer';
    mount.innerHTML = `
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <div class="brand" style="margin-bottom:14px">
              <span class="brand-mark">PTM</span>
              <span class="brand-text"><span class="brand-name">PTM</span><span class="brand-sub">Police Traffic Management</span></span>
            </div>
            <p class="muted small" style="max-width:38ch;line-height:1.7">
              Smart Traffic. Safer Roads. Better Uganda. PTM connects AI, IoT, smart cameras and
              police traffic operations into one unified management platform.
            </p>
            <div class="hero-flag" style="margin-top:18px"><span></span><span></span><span></span><span></span><span></span><span></span></div>
          </div>
          <div>
            <h5>Operations</h5>
            <ul>
              <li><a href="command-center.html">Command Center</a></li>
              <li><a href="cameras.html">Live Cameras</a></li>
              <li><a href="map.html">Uganda Traffic Map</a></li>
              <li><a href="police.html">Incident Monitoring</a></li>
            </ul>
          </div>
          <div>
            <h5>Enforcement</h5>
            <ul>
              <li><a href="ai-detection.html">AI Detection</a></li>
              <li><a href="violations.html">Traffic Violations</a></li>
              <li><a href="fines.html">Fines &amp; Payments</a></li>
              <li><a href="analytics.html">Analytics &amp; Reports</a></li>
            </ul>
          </div>
          <div>
            <h5>System</h5>
            <ul>
              <li><a href="iot.html">IoT Infrastructure</a></li>
              <li><a href="admin.html">Admin Dashboard</a></li>
              <li><a href="admin.html#users">User Management</a></li>
              <li><a href="admin.html#settings">System Settings</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} PTM — Police Traffic Management System. University demonstration prototype.</span>
          <span class="badge badge-sim"><span class="dot"></span> All camera feeds, detections and records on this site are SIMULATED</span>
        </div>
      </div>`;
  };

  PTM.startClock = function (el) {
    if (!el) return;
    const tick = () => {
      const d = new Date();
      el.textContent = `${U.dateStamp(d)}  ${U.stamp(d)} EAT`;
    };
    tick(); setInterval(tick, 1000);
  };

  /* =========================================================
     Toasts
     ========================================================= */
  PTM.toast = function (kind, title, body, ms) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'gold');
    const glyph = kind === 'red' ? '!' : kind === 'green' ? '✓' : 'i';
    el.innerHTML = `<span class="toast-icon">${glyph}</span><div><b>${U.esc(title)}</b>${body ? `<p>${U.esc(body)}</p>` : ''}</div>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms || 4600);
    return el;
  };

  /* =========================================================
     Modal
     ========================================================= */
  PTM.modal = function (opts) {
    const o = Object.assign({ title: '', subtitle: '', body: '', footer: '', width: 880, onClose: null }, opts);
    let bd = document.querySelector('.modal-backdrop');
    if (bd) bd.remove();
    bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="width:min(${o.width}px,100%)">
        <div class="modal-head">
          <div>
            <h3 class="h3">${o.title}</h3>
            ${o.subtitle ? `<div class="small muted" style="margin-top:5px">${o.subtitle}</div>` : ''}
          </div>
          <button class="close-x" aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z"/></svg>
          </button>
        </div>
        <div class="modal-body">${o.body}</div>
        ${o.footer ? `<div class="modal-foot">${o.footer}</div>` : ''}
      </div>`;
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('open'));
    const close = () => {
      bd.classList.remove('open');
      setTimeout(() => { bd.remove(); if (o.onClose) o.onClose(); }, 280);
    };
    bd.querySelector('.close-x').addEventListener('click', close);
    bd.addEventListener('click', e => { if (e.target === bd) close(); });
    const esc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    return { el: bd, close, body: bd.querySelector('.modal-body') };
  };

  /* =========================================================
     Animated numbers
     ========================================================= */
  PTM.animateNumber = function (el, to, dur, fmt) {
    if (!el) return;
    const from = parseFloat(String(el.textContent).replace(/[^0-9.\-]/g, '')) || 0;
    const start = performance.now();
    dur = dur || 900;
    fmt = fmt || (v => U.num(Math.round(v)));
    const tick = now => {
      const k = clamp((now - start) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(lerp(from, to, e));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  PTM.countUp = function (root) {
    (root || document).querySelectorAll('[data-count]').forEach(el => {
      const to = parseFloat(el.getAttribute('data-count'));
      const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const pre = el.getAttribute('data-prefix') || '';
      PTM.animateNumber(el, to, 1200, v => pre + (dec ? v.toFixed(dec) : U.num(Math.round(v))));
    });
  };

  /* =========================================================
     SVG charts
     ========================================================= */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  PTM.charts = {
    line(target, opts) {
      const host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) return;
      const o = Object.assign({ height: 220, w: 760, colors: ['#ffc93c', '#3ba7ff', '#4ee79d'], area: true, labels: [], yFmt: v => U.num(v), grid: true }, opts);
      const W = o.w, H = o.height, padL = 46, padR = 12, padT = 14, padB = 26;
      const series = o.series || [];
      const all = series.flatMap(s => s.data);
      const max = Math.max(1, ...all), min = 0;
      const n = series.length ? series[0].data.length : 1;
      const sx = i => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
      const sy = v => H - padB - ((v - min) / (max - min || 1)) * (H - padT - padB);

      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', style: `height:${H}px` });
      if (o.grid) {
        for (let g = 0; g <= 4; g++) {
          const y = padT + (g / 4) * (H - padT - padB);
          el('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,0.07)', 'stroke-width': 1 }, svg);
          const t = el('text', { x: padL - 8, y: y + 4, fill: '#6b7484', 'font-size': 10, 'text-anchor': 'end', 'font-family': 'ui-monospace,monospace' }, svg);
          t.textContent = o.yFmt(max - (g / 4) * (max - min));
        }
      }
      if (o.labels && o.labels.length) {
        const step = Math.ceil(o.labels.length / 8);
        o.labels.forEach((L, i) => {
          if (i % step !== 0) return;
          const t = el('text', { x: sx(i), y: H - 8, fill: '#6b7484', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace' }, svg);
          t.textContent = L;
        });
      }
      series.forEach((s, si) => {
        const col = s.color || o.colors[si % o.colors.length];
        let d = '';
        s.data.forEach((v, i) => { d += (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1) + ' '; });
        if (o.area) {
          const gid = 'g' + Math.random().toString(36).slice(2, 8);
          const defs = el('defs', {}, svg);
          const lg = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
          el('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': 0.34 }, lg);
          el('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 0 }, lg);
          el('path', { d: d + `L${sx(s.data.length - 1)} ${H - padB} L${sx(0)} ${H - padB} Z`, fill: `url(#${gid})` }, svg);
        }
        el('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
        const last = s.data[s.data.length - 1];
        el('circle', { cx: sx(s.data.length - 1), cy: sy(last), r: 3.4, fill: col }, svg);
      });
      host.innerHTML = '';
      host.appendChild(svg);
      if (o.legend !== false) {
        const lg = document.createElement('div');
        lg.className = 'chart-legend';
        lg.innerHTML = series.map((s, i) => `<span><i style="background:${s.color || o.colors[i % o.colors.length]}"></i>${U.esc(s.name || ('Series ' + (i + 1)))}</span>`).join('');
        host.appendChild(lg);
      }
    },

    bars(target, opts) {
      const host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) return;
      const o = Object.assign({ height: 240, w: 760, color: '#ffc93c', horizontal: false, items: [] }, opts);
      const items = o.items;
      const max = Math.max(1, ...items.map(i => i.value));
      if (o.horizontal) {
        host.innerHTML = items.map(it => `
          <div style="margin-bottom:13px">
            <div class="row-between small" style="margin-bottom:5px">
              <span class="muted">${U.esc(it.label)}</span>
              <b class="mono">${U.num(it.value)}</b>
            </div>
            <div class="bar-track"><div class="bar-fill ${it.tone || ''}" style="width:${(it.value / max * 100).toFixed(1)}%;${it.color ? 'background:' + it.color : ''}"></div></div>
          </div>`).join('');
        return;
      }
      const W = o.w, H = o.height, padB = 46, padT = 12;
      const bw = (W - 20) / Math.max(1, items.length);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, style: `height:${H}px` });
      for (let g = 0; g <= 3; g++) {
        const y = padT + (g / 3) * (H - padT - padB);
        el('line', { x1: 8, y1: y, x2: W - 8, y2: y, stroke: 'rgba(255,255,255,0.07)' }, svg);
      }
      items.forEach((it, i) => {
        const h = (it.value / max) * (H - padT - padB);
        const x = 10 + i * bw + bw * 0.16;
        const w = bw * 0.68;
        const y = H - padB - h;
        el('rect', { x, y, width: w, height: Math.max(1, h), rx: 3, fill: it.color || o.color, opacity: 0.9 }, svg);
        const t = el('text', { x: x + w / 2, y: H - padB + 15, fill: '#9aa4b4', 'font-size': 9.5, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace' }, svg);
        t.textContent = it.short || it.label;
        const v = el('text', { x: x + w / 2, y: y - 5, fill: '#fff', 'font-size': 9.5, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace' }, svg);
        v.textContent = U.num(it.value);
      });
      host.innerHTML = '';
      host.appendChild(svg);
    },

    donut(target, opts) {
      const host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) return;
      const o = Object.assign({ size: 170, segments: [], center: '', sub: '' }, opts);
      const total = o.segments.reduce((a, s) => a + s.value, 0) || 1;
      const S = o.size, R = S / 2 - 8, C = S / 2;
      const svg = el('svg', { viewBox: `0 0 ${S} ${S}`, style: `width:${S}px;max-width:100%` });
      let ang = -Math.PI / 2;
      o.segments.forEach(s => {
        const frac = s.value / total;
        const a2 = ang + frac * Math.PI * 2;
        const large = frac > 0.5 ? 1 : 0;
        const x1 = C + Math.cos(ang) * R, y1 = C + Math.sin(ang) * R;
        const x2 = C + Math.cos(a2) * R, y2 = C + Math.sin(a2) * R;
        el('path', {
          d: `M${C} ${C} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
          fill: s.color, stroke: '#07080c', 'stroke-width': 2
        }, svg);
        ang = a2;
      });
      el('circle', { cx: C, cy: C, r: R * 0.6, fill: '#080a0f' }, svg);
      const t1 = el('text', { x: C, y: C - 1, fill: '#fff', 'font-size': 19, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace' }, svg);
      t1.textContent = o.center;
      const t2 = el('text', { x: C, y: C + 16, fill: '#6b7484', 'font-size': 8.5, 'text-anchor': 'middle', 'letter-spacing': '1.4', 'font-family': 'ui-monospace,monospace' }, svg);
      t2.textContent = o.sub;
      host.innerHTML = '';
      host.appendChild(svg);
      const lg = document.createElement('div');
      lg.className = 'chart-legend';
      lg.style.flexDirection = 'column';
      lg.innerHTML = o.segments.map(s => `<span><i style="background:${s.color};height:9px;width:9px;border-radius:2px"></i>${U.esc(s.label)} <b class="mono" style="margin-left:auto;color:#fff">${U.num(s.value)}</b></span>`).join('');
      host.appendChild(lg);
    },

    spark(target, values, color) {
      const host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) return;
      const W = 140, H = 34;
      const max = Math.max(1, ...values), min = Math.min(...values);
      const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - ((v - min) / ((max - min) || 1)) * (H - 5) - 2.5]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      host.innerHTML = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color || '#ffc93c'}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
    }
  };

  /* =========================================================
     Loading screen
     ========================================================= */
  const LOAD_STEPS = [
    'Initializing Smart Traffic Infrastructure...',
    'Connecting IoT Devices...',
    'Initializing AI Cameras...',
    'Connecting Traffic Control Network...',
    'Loading Uganda Traffic Map...',
    'Securing Police Network...',
    'SYSTEM READY'
  ];

  PTM.boot = function (opts) {
    const o = Object.assign({ minMs: 2600, skipKey: 'booted', skip: false }, opts || {});
    const loader = document.getElementById('loader');
    const started = performance.now();

    const done = () => {
      if (!loader) return;
      loader.classList.add('done');
      setTimeout(() => { loader.style.display = 'none'; }, 760);
      PTM.countUp(document);
      document.querySelectorAll('.fade-in').forEach(x => x.style.visibility = 'visible');
      if (o.onDone) o.onDone();
    };

    if (!loader || o.skip) { done(); return; }

    const bar = document.getElementById('loader-bar');
    const msg = document.getElementById('loader-msg');
    const pct = document.getElementById('loader-pct');
    const log = document.getElementById('loader-log');

    const frames = Array.prototype.slice.call(loader.querySelectorAll('.loader-frame'));
    let f = 0;
    frames.forEach(el => {
      const src = el.dataset.src;
      if (!src) return;
      el.style.backgroundImage = `url('${src}')`;
      if (el.dataset.pos) el.style.backgroundPosition = el.dataset.pos;
      const warm = new Image();
      warm.src = src;
    });
    const nextFrame = () => {
      if (frames.length < 2) return;
      frames[f].classList.remove('on');
      f = (f + 1) % frames.length;
      frames[f].classList.add('on');
    };

    let i = 0;
    const runStep = () => {
      if (i >= LOAD_STEPS.length) {
        const wait = Math.max(0, o.minMs - (performance.now() - started));
        setTimeout(done, wait);
        return;
      }
      if (i > 0) nextFrame();
      const p = Math.round(((i + 1) / LOAD_STEPS.length) * 100);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%  •  ' + (i + 1) + '/' + LOAD_STEPS.length;
      if (msg) msg.textContent = LOAD_STEPS[i];
      if (log) {
        const line = document.createElement('div');
        const t = new Date();
        line.innerHTML = `<span style="color:#4a5262">[${U.stamp(t)}]</span> ${U.esc(LOAD_STEPS[i])} <b>OK</b>`;
        log.appendChild(line);
        while (log.children.length > 5) log.removeChild(log.firstChild);
      }
      i++;
      setTimeout(runStep, o.minMs / (LOAD_STEPS.length + 0.6) * (0.7 + Math.random() * 0.6));
    };
    runStep();
  };

  /* =========================================================
     Camera tile factory (shared by several pages)
     ========================================================= */
  PTM.cameraTile = function (cam, opts) {
    const o = opts || {};
    const tile = document.createElement('div');
    tile.className = 'cam-tile' + (o.selected ? ' selected' : '');
    tile.dataset.cam = cam.id;
    const chip = cam.online
      ? `<span class="cam-live-chip${o.showSimChip === false ? '' : ' sim'}"><i></i>LIVE</span>`
      : `<span class="cam-live-chip off"><i></i>OFFLINE</span>`;
    tile.innerHTML = `
      <canvas></canvas>
      <div class="cctv-fx"></div>
      ${chip}
      ${cam.online ? '' : `<div class="cam-offline"><span>No signal<br><b style="color:#ffc93c">${U.esc(cam.id)}</b></span></div>`}
    `;
    if (!cam.online) return { tile, sim: null };

    const canvas = tile.querySelector('canvas');
    const sim = new PTMSim(canvas, Object.assign({
      seed: cam.seed, camId: cam.id, location: cam.location, district: cam.district,
      hour: cam.hour, weather: cam.weather, density: cam.density,
      speedLimit: cam.speedLimit, pedestrianZone: cam.pedestrianZone,
      intersection: cam.intersection, gps: cam.gps, quality: o.quality || 'low',
      ai: o.ai !== false, aiLabels: o.aiLabels !== false, emitEvents: !!o.emitEvents
    }, o.sim || {}));
    sim.start();
    return { tile, sim, canvas };
  };

  /* =========================================================
     Boot helpers used by every page
     ========================================================= */
  PTM.init = function (opts) {
    const o = opts || {};
    PTM.mountNav(o.active);
    PTM.mountFooter();
    document.querySelectorAll('[data-ts-live]').forEach(el => {
      const tick = () => { el.textContent = U.stamp(new Date()); };
      tick(); setInterval(tick, 1000);
    });
  };

  PTM.LOAD_STEPS = LOAD_STEPS;
})(window);
