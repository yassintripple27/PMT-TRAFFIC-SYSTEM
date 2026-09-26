/* ============================================================
   PTM TRAFFIC SIMULATION ENGINE
   Renders perspective-projected CCTV traffic scenes on canvas
   with a computer-vision overlay. Everything here is simulated.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- utilities ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (r, a, b) => a + r() * (b - a);
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const mix = (c1, c2, t) => [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t))
  ];
  const rgb = (c, a) => (a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);
  const shade = (c, m) => [clamp(Math.round(c[0] * m), 0, 255), clamp(Math.round(c[1] * m), 0, 255), clamp(Math.round(c[2] * m), 0, 255)];

  /* ---------- sky / light palettes keyed by hour ---------- */
  const SKY_KEYS = [
    { h: 0, top: [6, 9, 18], mid: [9, 13, 26], hor: [16, 22, 38], amb: 0.3 },
    { h: 5, top: [12, 18, 38], mid: [58, 46, 66], hor: [150, 96, 74], amb: 0.42 },
    { h: 7, top: [62, 100, 150], mid: [140, 158, 178], hor: [206, 190, 168], amb: 0.78 },
    { h: 12, top: [78, 128, 184], mid: [140, 178, 210], hor: [198, 214, 224], amb: 1 },
    { h: 17, top: [74, 112, 162], mid: [158, 150, 152], hor: [226, 186, 140], amb: 0.86 },
    { h: 18.6, top: [40, 40, 78], mid: [130, 72, 66], hor: [228, 128, 62], amb: 0.56 },
    { h: 20, top: [10, 14, 30], mid: [18, 22, 42], hor: [38, 38, 60], amb: 0.34 },
    { h: 24, top: [6, 9, 18], mid: [9, 13, 26], hor: [16, 22, 38], amb: 0.3 }
  ];

  function skyFor(hour) {
    let i = 0;
    while (i < SKY_KEYS.length - 2 && hour > SKY_KEYS[i + 1].h) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    const t = clamp((hour - a.h) / (b.h - a.h || 1), 0, 1);
    return {
      top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), hor: mix(a.hor, b.hor, t),
      amb: lerp(a.amb, b.amb, t)
    };
  }

  /* ---------- vehicle catalogue ---------- */
  const TYPES = {
    car: { l: 4.35, w: 1.78, h: 1.46, cls: 'CAR', vuln: false, vmin: 9, vmax: 19 },
    suv: { l: 4.7, w: 1.9, h: 1.82, cls: 'SUV', vuln: false, vmin: 9, vmax: 18 },
    pickup: { l: 5.1, w: 1.86, h: 1.86, cls: 'PICKUP', vuln: false, vmin: 8, vmax: 17 },
    boda: { l: 1.95, w: 0.72, h: 1.52, cls: 'MOTORCYCLE', vuln: true, vmin: 7, vmax: 17 },
    bicycle: { l: 1.75, w: 0.55, h: 1.55, cls: 'BICYCLE', vuln: true, vmin: 3.4, vmax: 6 },
    bus: { l: 11.2, w: 2.52, h: 3.15, cls: 'BUS', vuln: false, vmin: 7, vmax: 14 },
    minibus: { l: 6.4, w: 2.1, h: 2.55, cls: 'MINIBUS', vuln: false, vmin: 8, vmax: 16 },
    truck: { l: 9.2, w: 2.5, h: 3.4, cls: 'TRUCK', vuln: false, vmin: 6.5, vmax: 13 },
    person: { l: 0.45, w: 0.5, h: 1.7, cls: 'PERSON', vuln: true, vmin: 1.1, vmax: 1.6 }
  };

  const BODY_COLORS = [
    [232, 233, 235], [198, 201, 206], [148, 153, 161], [86, 90, 98],
    [42, 45, 52], [24, 26, 31], [126, 26, 30], [26, 46, 84],
    [16, 62, 54], [92, 96, 74], [168, 152, 118], [58, 62, 72],
    [122, 116, 108], [40, 68, 96], [84, 40, 34]
  ];
  const TAXI_WHITE = [238, 238, 234];
  const TAXI_BAND = [240, 176, 26];
  const POLICE_WHITE = [240, 241, 243];
  const CLOTH = [
    [58, 66, 92], [112, 44, 44], [40, 84, 62], [128, 112, 70],
    [70, 52, 96], [34, 38, 46], [146, 122, 96], [92, 40, 56], [40, 72, 96]
  ];
  const SKIN = [[74, 50, 38], [92, 62, 46], [58, 38, 29], [110, 76, 54]];

  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  function makePlate(r) {
    if (r() < 0.07) return 'UG ' + Math.floor(rnd(r, 1000, 8999)) + ' A';
    const a = LETTERS[Math.floor(r() * 23)], b = LETTERS[Math.floor(r() * 23)], c = LETTERS[Math.floor(r() * 23)];
    return 'U' + a + b + ' ' + Math.floor(rnd(r, 100, 999)) + c;
  }

  /* ---------- the simulation ---------- */
  class PTMSim {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      const o = opts || {};
      this.o = Object.assign({
        seed: 1, camId: 'CAM-000', location: 'KAMPALA ROAD', district: 'Kampala',
        hour: 17.4, weather: 'clear', density: 0.55, ai: true, aiLabels: true,
        emitEvents: true, quality: 'low', speedLimit: 60, view: 'front',
        layout: 'road', zoom: 1, panX: 0, jitter: true, gps: '0.3471N, 32.5825E',
        pedestrianZone: false, intersection: true
      }, o);

      this.rng = mulberry32(this.o.seed * 2654435761 % 2147483647 || 7);
      this.t = 0;
      this.actors = [];
      this.buildings = [];
      this.props = [];
      this.patches = [];
      this.roadside = [];
      this.running = false;
      this.visible = true;
      this.trackSeq = 100;
      this.eventCooldown = 0;
      this.fps = 0;
      this.lastFrame = 0;
      this._acc = 0;
      this._frameMs = this.o.quality === 'high' ? 1000 / 30 : 1000 / 19;
      this.detections = [];
      this.lastStats = { vehicles: 0, motorcycles: 0, pedestrians: 0, avgSpeed: 0, condition: 'FLOWING' };
      this.lightPhase = this.rng() * 22;
      this.alarm = null;
      this.alarmT = 0;
      this.ptzKick = 0;
      this.noiseTile = null;

      this._buildWorld();
      this.resize();
      PTMSim._register(this);
    }

    /* ----- world construction ----- */
    _buildWorld() {
      const r = this.rng, o = this.o;
      this.roadHalf = o.layout === 'residential' ? 5.0 : 7.2;
      this.laneW = this.roadHalf / 2;
      this.stopLineZ = 54;

      // buildings
      for (let side = -1; side <= 1; side += 2) {
        let z = rnd(r, 10, 16);
        let guard = 0;
        while (z < 210 && guard++ < 40) {
          const w = rnd(r, 6, 13);
          const d = rnd(r, 7, 14);
          const h = o.layout === 'residential' ? rnd(r, 3.4, 8) : rnd(r, 5, rnd(r, 10, 30));
          const inset = rnd(r, 0.4, 4.5);
          const base = [rnd(r, 52, 108), rnd(r, 54, 104), rnd(r, 58, 108)];
          const b = {
            kind: 'building', side, z1: z, z2: z + d,
            x1: side * (this.roadHalf + 3.1 + inset),
            h, w, d, base,
            winCols: Math.max(2, Math.floor(w / 2.4)),
            winRows: Math.max(1, Math.floor(h / 3.0)),
            litSeed: Math.floor(r() * 1e6),
            shop: r() < 0.42 && h < 9,
            shopColor: pick(r, [[150, 40, 36], [28, 74, 120], [40, 96, 62], [176, 128, 30], [92, 52, 110]])
          };
          this.buildings.push(b);
          z += d + rnd(r, 1.2, 7);
        }
      }

      // street lights + poles + signs
      for (let side = -1; side <= 1; side += 2) {
        for (let z = 16; z < 200; z += rnd(r, 22, 30)) {
          this.props.push({ kind: 'lamp', side, z, h: rnd(r, 8.2, 9.6) });
        }
      }
      for (let i = 0; i < 5; i++) {
        const side = r() < 0.5 ? -1 : 1;
        this.props.push({
          kind: 'sign', side, z: rnd(r, 22, 150), h: rnd(r, 2.6, 3.4),
          type: pick(r, ['limit', 'stop', 'yield', 'info']),
          text: pick(r, ['60', '40', '50', 'STOP'])
        });
      }
      // trees / vegetation
      for (let i = 0; i < 9; i++) {
        const side = r() < 0.5 ? -1 : 1;
        this.props.push({ kind: 'tree', side, z: rnd(r, 20, 180), h: rnd(r, 4.5, 8.5), lean: rnd(r, -0.2, 0.2) });
      }
      if (o.intersection) {
        this.props.push({ kind: 'signal', side: -1, z: this.stopLineZ - 2.5, h: 6.4 });
        this.props.push({ kind: 'signal', side: 1, z: this.stopLineZ + 4.5, h: 6.4 });
      }

      // asphalt wear patches
      for (let i = 0; i < 26; i++) {
        this.patches.push({ x: rnd(r, -this.roadHalf, this.roadHalf), z: rnd(r, 8, 190), w: rnd(r, 0.8, 3.4), l: rnd(r, 1.5, 8), a: rnd(r, 0.04, 0.14) });
      }

      this._spawnInitial();
    }

    _laneX(dir, lane) {
      // Uganda drives on the LEFT: traffic moving away sits on the -x half
      const s = dir > 0 ? -1 : 1;
      return s * (this.laneW * (lane === 0 ? 0.5 : 1.5));
    }

    _spawnActor(r, forceZ) {
      const o = this.o;
      const roll = r();
      let type;
      if (roll < 0.30) type = 'car';
      else if (roll < 0.44) type = 'boda';
      else if (roll < 0.55) type = 'suv';
      else if (roll < 0.63) type = 'pickup';
      else if (roll < 0.72) type = 'minibus';
      else if (roll < 0.79) type = 'bus';
      else if (roll < 0.87) type = 'truck';
      else if (roll < 0.90) type = 'bicycle';
      else type = 'car';

      const T = TYPES[type];
      const dir = r() < 0.5 ? 1 : -1;               // +1 = travelling away
      const lane = r() < 0.62 ? 0 : 1;
      const z = forceZ !== undefined ? forceZ : (dir > 0 ? rnd(r, 4, 15) : rnd(r, 60, 200));
      const speed = rnd(r, T.vmin, T.vmax) * (0.72 + o.density * 0.5);
      const isTaxi = (type === 'minibus' || type === 'bus') && r() < 0.62;
      const isPolice = type === 'suv' && r() < 0.035;

      const a = {
        id: ++this.trackSeq, type, dir, lane, z,
        x: this._laneX(dir, lane),
        targetX: 0, vz: dir * speed, speed,
        len: T.l, wid: T.w, hgt: T.h,
        color: isTaxi ? TAXI_WHITE : isPolice ? POLICE_WHITE : pick(r, BODY_COLORS),
        taxi: isTaxi, police: isPolice,
        plate: makePlate(r),
        trail: [], flagged: {},
        wobble: rnd(r, 0, 6.28), wobbleAmp: type === 'boda' || type === 'bicycle' ? rnd(r, 0.05, 0.16) : rnd(r, 0, 0.05),
        wrongSide: false, overtaking: false,
        brakeLight: 0, headOn: false,
        conf: rnd(r, 0.86, 0.995)
      };
      a.targetX = a.x;
      // rare wrong-side driver
      if (r() < 0.035 && !isPolice) { a.x = -a.x; a.targetX = a.x; a.wrongSide = true; a.wrongSideUntil = a.z + rnd(r, 30, 70); }
      this.actors.push(a);
      return a;
    }

    _spawnInitial() {
      const r = this.rng, o = this.o;
      const n = Math.round(lerp(7, 22, o.density));
      for (let i = 0; i < n; i++) {
        const a = this._spawnActor(r);
        a.z = rnd(r, 6, 175);
      }
      // pedestrians on the sidewalks
      const pn = Math.round(lerp(2, 9, o.density));
      for (let i = 0; i < pn; i++) this._spawnPed(r);
      // crossing pedestrians
      if (o.intersection) for (let i = 0; i < 3; i++) this._spawnCrosser(r);
      if (o.pedestrianZone) for (let i = 0; i < 5; i++) this._spawnPed(r, true);
    }

    _spawnPed(r, onRoad) {
      const side = r() < 0.5 ? -1 : 1;
      const a = {
        id: ++this.trackSeq, type: 'person', dir: r() < 0.5 ? 1 : -1, lane: -1,
        z: rnd(r, 8, 120),
        x: side * rnd(r, this.roadHalf + 0.7, this.roadHalf + 2.6),
        vz: 0, speed: rnd(r, 1.0, 1.55), len: 0.45, wid: 0.5, hgt: rnd(r, 1.58, 1.82),
        color: pick(r, CLOTH), skin: pick(r, SKIN), plate: null,
        trail: [], flagged: {}, phase: rnd(r, 0, 6.28), sidewalk: true, onRoad: !!onRoad,
        conf: rnd(r, 0.82, 0.97)
      };
      a.vz = a.dir * a.speed * 0.35;
      a.vx = (r() < 0.5 ? 1 : -1) * rnd(r, 0.15, 0.5);
      a.targetX = a.x;
      this.actors.push(a);
      return a;
    }

    _spawnCrosser(r) {
      const a = {
        id: ++this.trackSeq, type: 'person', dir: 1, lane: -1,
        z: this.stopLineZ + rnd(r, 0.5, 4),
        x: -this.roadHalf - 2, vx: rnd(r, 0.75, 1.25), vz: 0,
        speed: 1.1, len: 0.45, wid: 0.5, hgt: rnd(r, 1.5, 1.8),
        color: pick(r, CLOTH), skin: pick(r, SKIN), plate: null,
        trail: [], flagged: {}, phase: rnd(r, 0, 6.28), crossing: true,
        conf: rnd(r, 0.84, 0.97)
      };
      this.actors.push(a);
      return a;
    }

    /* ----- projection ----- */
    resize() {
      const c = this.canvas;
      const rect = c.getBoundingClientRect();
      const dpr = this.o.quality === 'high' ? Math.min(global.devicePixelRatio || 1, 1.6) : 0.62;
      const w = Math.max(160, Math.round((rect.width || 320) * dpr));
      const h = Math.max(90, Math.round((rect.height || 180) * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      this.W = w; this.H = h;
      this.horizonY = h * 0.335;
      this.focal = h * 1.16 * this.o.zoom;
      this.cx = w / 2 - this.o.panX * (w * 0.16);
      this.camH = 6.1;
      this.nearZ = 1.6;
      this.hazeY = this._groundY(95);
    }

    project(x, y, z) {
      if (z <= this.nearZ) return null;
      const s = this.focal / z;
      return { sx: this.cx + x * s, sy: this.horizonY + (this.camH - y) * s, s };
    }
    _groundY(z) { const p = this.project(0, 0, Math.max(z, this.nearZ + 0.01)); return p ? p.sy : this.H; }

    /* ----- signal cycle ----- */
    signalState() {
      if (!this.o.intersection) return { away: 'green', toward: 'green', t: 0 };
      const cyc = ((this.t + this.lightPhase) % 26);
      // away (x<0) green 0-12, amber 12-15, red 15-26
      let away = cyc < 12 ? 'green' : cyc < 15 ? 'amber' : 'red';
      let toward = cyc < 13 ? 'red' : cyc < 16 ? 'amber' : 'green';
      return { away, toward, t: cyc };
    }

    /* ----- physics ----- */
    step(dt) {
      this.t += dt;
      const o = this.o, r = this.rng;
      const sig = this.signalState();
      this.eventCooldown = Math.max(0, this.eventCooldown - dt);

      const limit = o.speedLimit / 3.6;
      let vCount = 0, mCount = 0, pCount = 0, speedSum = 0, speedN = 0;
      const congestion = o.density > 0.78 ? 0.55 : 1;

      for (let i = this.actors.length - 1; i >= 0; i--) {
        const a = this.actors[i];

        if (a.type === 'person') {
          if (a.crossing) {
            a.x += a.vx * dt;
            a.phase += dt * 7;
            if (a.x > this.roadHalf + 2.4) { this.actors.splice(i, 1); if (r() < 0.85) this._spawnCrosser(r); }
          } else {
            a.z += a.vz * dt;
            a.x += (a.vx || 0) * dt;
            a.phase += dt * 6.4;
            const lim = this.roadHalf + (o.pedestrianZone ? 0.4 : 2.9);
            if (a.x > lim) a.vx = -Math.abs(a.vx || 0.3);
            if (a.x < -lim) a.vx = Math.abs(a.vx || 0.3);
            if (a.z > 200 || a.z < 4) { this.actors.splice(i, 1); this._spawnPed(r, o.pedestrianZone && r() < 0.5); }
          }
          pCount++;
          continue;
        }

        // vehicles
        const approachingStop = a.dir > 0
          ? (a.z < this.stopLineZ - 1 && a.z > this.stopLineZ - 34)
          : (a.z > this.stopLineZ + 2 && a.z < this.stopLineZ + 40);
        const state = a.dir > 0 ? sig.away : sig.toward;

        // car-following: find leader in the same lane & direction
        let leader = null, gap = 1e9;
        for (let j = 0; j < this.actors.length; j++) {
          const b = this.actors[j];
          if (b === a || b.type === 'person' || b.dir !== a.dir) continue;
          if (Math.abs(b.x - a.x) > 2.0) continue;
          const d = (b.z - a.z) * a.dir;
          if (d > 0 && d < gap) { gap = d; leader = b; }
        }

        let target = a.speed * congestion;
        if (leader && gap < 26) target = Math.min(target, leader.vz * leader.dir * 0.94);
        if (o.intersection && approachingStop && state !== 'green') {
          const distToStop = a.dir > 0 ? (this.stopLineZ - a.z) : (a.z - this.stopLineZ);
          if (distToStop > 0 && distToStop < 26) target = Math.min(target, distToStop * 0.55);
          if (distToStop < 1.6) target = 0;
        }

        const cur = Math.abs(a.vz);
        const nv = cur + clamp(target - cur, -6.5 * dt, 3.2 * dt);
        a.vz = a.dir * Math.max(0, nv);
        a.brakeLight = clamp(a.brakeLight + ((target < cur - 0.6 ? 1 : -1) * dt * 4), 0, 1);
        a.z += a.vz * dt;

        // lateral: wobble + lane changes
        a.wobble += dt * rnd(r, 1.2, 2.4);
        let tx = a.targetX + Math.sin(a.wobble) * a.wobbleAmp;
        if (a.wrongSide) {
          if ((a.dir > 0 && a.z > a.wrongSideUntil) || (a.dir < 0 && a.z < a.wrongSideUntil)) {
            a.wrongSide = false; a.targetX = this._laneX(a.dir, a.lane);
          }
        } else if (!a.overtaking && r() < dt * 0.05 && o.density > 0.4) {
          a.overtaking = true; a.ovtT = 0; a.ovtFrom = a.targetX;
          a.ovtTo = this._laneX(a.dir, a.lane === 0 ? 1 : 0);
        }
        if (a.overtaking) {
          a.ovtT += dt;
          const k = clamp(a.ovtT / 3.4, 0, 1);
          a.targetX = lerp(a.ovtFrom, a.ovtTo, k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
          if (k >= 1) { a.overtaking = false; a.lane = a.lane === 0 ? 1 : 0; }
        }
        a.x += (tx - a.x) * clamp(dt * 3.2, 0, 1);

        // despawn / respawn
        if ((a.dir > 0 && a.z > 205) || (a.dir < 0 && a.z < 4.2)) {
          this.actors.splice(i, 1);
          const target2 = Math.round(lerp(8, 24, o.density));
          if (this.actors.length < target2 + 4) this._spawnActor(r);
          continue;
        }

        const kmh = Math.abs(a.vz) * 3.6;
        if (a.z > 6 && a.z < 160) {
          vCount++; speedSum += kmh; speedN++;
          if (a.type === 'boda' || a.type === 'bicycle') mCount++;
        }

        /* ---- violation logic ---- */
        if (o.emitEvents && this.eventCooldown <= 0) {
          if (a.wrongSide && !a.flagged.wrong) {
            a.flagged.wrong = true;
            this._emit('WRONG_SIDE', a, 'critical', 'Wrong-side driving');
          }
          if (kmh > o.speedLimit * 1.32 && !a.flagged.speed) {
            a.flagged.speed = true;
            this._emit('SPEED', a, 'warning', 'Speed ' + Math.round(kmh) + ' km/h in ' + o.speedLimit + ' zone');
          }
          if (state === 'red' && !a.flagged.red) {
            const dist = a.dir > 0 ? (a.z - this.stopLineZ) : (this.stopLineZ - a.z);
            if (dist < -1.2 && kmh > 6) {
              a.flagged.red = true;
              this._emit('RED_LIGHT', a, 'critical', 'Red light violation');
            }
          }
          if (a.overtaking && Math.sign(a.x) !== Math.sign(this._laneX(a.dir, a.lane)) && kmh > 24 && !a.flagged.ovt) {
            a.flagged.ovt = true;
            this._emit('OVERTAKE', a, 'critical', 'Dangerous overtaking');
          }
          if (leader && gap < 1.9 && kmh > 12 && !a.flagged.hit) {
            a.flagged.hit = true; leader.flagged.hit = true;
            this._emit('COLLISION', a, 'critical', 'Possible vehicle collision', { with: leader });
            this.alarm = { type: 'collision', x: a.x, z: a.z };
            this.alarmT = 6;
          }
        }
      }

      // keep population topped up
      const want = Math.round(lerp(8, 24, o.density));
      if (this.actors.filter(a => a.type !== 'person').length < want && r() < dt * 2.4) this._spawnActor(r);
      if (this.actors.filter(a => a.type === 'person').length < 3 && r() < dt * 0.6) this._spawnPed(r);

      if (this.alarmT > 0) this.alarmT -= dt;
      if (this.ptzKick > 0) this.ptzKick -= dt;
      if (r() < dt * 0.06) this.ptzKick = 0.55;

      const avg = speedN ? speedSum / speedN : 0;
      const cond = avg < 14 ? 'CONGESTED' : avg < 30 ? 'SLOW' : 'FLOWING';
      this.lastStats = { vehicles: vCount, motorcycles: mCount, pedestrians: pCount, avgSpeed: avg, condition: cond };
    }

    _emit(type, a, sev, detail, extra) {
      this.eventCooldown = 2.4;
      const ev = Object.assign({
        type, severity: sev, detail,
        camId: this.o.camId, location: this.o.location, district: this.o.district,
        plate: a.plate || null, vehicleType: (TYPES[a.type] || {}).cls || 'OBJECT',
        speed: Math.round(Math.abs(a.vz) * 3.6),
        confidence: a.conf, simTime: this.t,
        gps: this.o.gps
      }, extra || {});
      if (typeof this.o.onEvent === 'function') this.o.onEvent(ev);
      PTMSim.emitGlobal(ev, this);
    }

    /* ----- render ----- */
    render() {
      const c = this.ctx, W = this.W, H = this.H;
      if (!W || !H) return;
      const o = this.o;
      const sky = skyFor(o.hour);
      let amb = sky.amb;
      if (o.weather === 'rain') amb *= 0.74;
      if (o.weather === 'fog') amb *= 0.8;
      this.amb = amb;
      this.sky = sky;
      this.night = amb < 0.46;
      this.horizonColor = o.weather === 'fog' ? mix(sky.hor, [210, 214, 218], 0.5) : sky.hor;

      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);

      // camera jitter / PTZ micro-movement
      let jx = 0, jy = 0;
      if (o.jitter) {
        const n = this.t;
        jx = Math.sin(n * 0.7) * 0.9 + Math.sin(n * 2.3) * 0.45 + (Math.random() - 0.5) * 0.5;
        jy = Math.cos(n * 0.53) * 0.6 + (Math.random() - 0.5) * 0.35;
        if (this.ptzKick > 0) { jx += Math.sin(this.ptzKick * 22) * 2.4; jy += Math.cos(this.ptzKick * 18) * 1.5; }
      }
      c.save();
      c.translate(jx, jy);

      this._drawSky(c, W, H);
      this._drawGround(c, W, H);
      this._drawRoad(c);
      this._drawMarkings(c);
      this._drawScene(c);
      this._drawWeather(c, W, H);
      if (this.night) this._drawNightLight(c);
      if (o.ai) this._drawAI(c);
      c.restore();

      if (this.night) this._applyIR(c, W, H);
      this._drawGrain(c, W, H);
    }

    _drawSky(c, W, H) {
      const s = this.sky;
      const g = c.createLinearGradient(0, 0, 0, this.horizonY + 6);
      g.addColorStop(0, rgb(s.top));
      g.addColorStop(0.58, rgb(s.mid));
      g.addColorStop(1, rgb(s.hor));
      c.fillStyle = g;
      c.fillRect(-14, -14, W + 28, this.horizonY + 20);

      // sun / moon glow
      const day = s.amb > 0.5;
      const gx = W * (day ? 0.74 : 0.26), gy = this.horizonY - H * (day ? 0.16 : 0.11);
      const gg = c.createRadialGradient(gx, gy, 0, gx, gy, H * 0.34);
      gg.addColorStop(0, day ? 'rgba(255,236,190,0.5)' : 'rgba(206,220,255,0.26)');
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg;
      c.fillRect(0, 0, W, this.horizonY + 10);

      // distant skyline silhouette
      const r = mulberry32(99 + this.o.seed);
      c.fillStyle = rgb(shade(s.hor, 0.55), 0.9);
      c.beginPath();
      c.moveTo(-10, this.horizonY + 2);
      let x = -10;
      while (x < W + 20) {
        const w = 8 + r() * 34;
        const h = 3 + r() * (H * 0.045);
        c.lineTo(x, this.horizonY + 2 - h);
        c.lineTo(x + w, this.horizonY + 2 - h);
        x += w;
      }
      c.lineTo(W + 20, this.horizonY + 2);
      c.closePath(); c.fill();
    }

    _drawGround(c, W, H) {
      const base = this.night ? [26, 34, 24] : [72, 86, 52];
      const col = shade(mix(base, this.horizonColor, 0.34), this.amb * 0.92 + 0.12);
      const g = c.createLinearGradient(0, this.horizonY, 0, H);
      g.addColorStop(0, rgb(mix(col, this.horizonColor, 0.62)));
      g.addColorStop(1, rgb(shade(col, 0.72)));
      c.fillStyle = g;
      c.fillRect(-14, this.horizonY - 1, W + 28, H - this.horizonY + 15);
    }

    _roadQuad(c, x0, x1, z0, z1) {
      const a = this.project(x0, 0, z1), b = this.project(x1, 0, z1);
      const d = this.project(x1, 0, z0), e = this.project(x0, 0, z0);
      if (!a || !b || !d || !e) return false;
      c.beginPath();
      c.moveTo(a.sx, a.sy); c.lineTo(b.sx, b.sy); c.lineTo(d.sx, d.sy); c.lineTo(e.sx, e.sy);
      c.closePath(); c.fill();
      return true;
    }

    _drawRoad(c) {
      const rh = this.roadHalf, far = 210, near = this.nearZ + 0.05;
      // sidewalks
      c.fillStyle = rgb(shade(this.night ? [40, 42, 46] : [126, 124, 118], this.amb * 0.9 + 0.16));
      this._roadQuad(c, -rh - 3.1, -rh, near, far);
      this._roadQuad(c, rh, rh + 3.1, near, far);
      // kerb line
      c.fillStyle = rgb(shade(this.night ? [70, 72, 76] : [168, 166, 158], this.amb * 0.9 + 0.2));
      this._roadQuad(c, -rh - 0.32, -rh, near, far);
      this._roadQuad(c, rh, rh + 0.32, near, far);

      // asphalt
      const g = c.createLinearGradient(0, this.horizonY, 0, this.H);
      const asp = this.night ? [30, 32, 37] : [74, 77, 83];
      g.addColorStop(0, rgb(mix(asp, this.horizonColor, 0.66)));
      g.addColorStop(0.45, rgb(shade(asp, this.amb * 0.9 + 0.3)));
      g.addColorStop(1, rgb(shade(asp, this.amb * 0.82 + 0.2)));
      c.fillStyle = g;
      this._roadQuad(c, -rh, rh, near, far);

      if (this.o.weather === 'rain') {
        c.fillStyle = 'rgba(120,150,180,0.11)';
        this._roadQuad(c, -rh, rh, near, far);
      }

      // wear patches
      c.save();
      for (const p of this.patches) {
        c.fillStyle = `rgba(0,0,0,${p.a})`;
        this._roadQuad(c, p.x - p.w / 2, p.x + p.w / 2, p.z, p.z + p.l);
      }
      c.restore();
    }

    _drawMarkings(c) {
      const rh = this.roadHalf, lw = this.laneW;
      const paint = this.night ? [196, 198, 196] : [232, 232, 226];
      c.fillStyle = rgb(shade(paint, this.amb * 0.86 + 0.32), 0.92);

      // centre double line
      this._roadQuad(c, -0.16, -0.05, this.nearZ + 0.1, 205);
      this._roadQuad(c, 0.05, 0.16, this.nearZ + 0.1, 205);

      // lane dashes
      for (const lx of [-lw, lw]) {
        for (let z = 8; z < 200; z += 9) {
          this._roadQuad(c, lx - 0.075, lx + 0.075, z, z + 4.2);
        }
      }
      // edge lines
      c.fillStyle = rgb(shade(paint, this.amb * 0.8 + 0.3), 0.72);
      this._roadQuad(c, -rh + 0.16, -rh + 0.3, this.nearZ + 0.1, 205);
      this._roadQuad(c, rh - 0.3, rh - 0.16, this.nearZ + 0.1, 205);

      if (this.o.intersection) {
        // stop lines
        c.fillStyle = rgb(shade(paint, this.amb * 0.86 + 0.32), 0.9);
        this._roadQuad(c, -rh + 0.2, -0.2, this.stopLineZ - 0.5, this.stopLineZ);
        this._roadQuad(c, 0.2, rh - 0.2, this.stopLineZ + 3.4, this.stopLineZ + 3.9);
        // zebra crossing
        for (let z = this.stopLineZ + 5.4; z < this.stopLineZ + 10.4; z += 1.15) {
          for (let x = -rh + 0.5; x < rh - 0.5; x += 1.5) {
            this._roadQuad(c, x, x + 0.72, z, z + 0.62);
          }
        }
      }
      if (this.o.pedestrianZone) {
        c.fillStyle = 'rgba(220,70,60,0.35)';
        this._roadQuad(c, -rh, rh, this.nearZ + 0.1, 22);
      }
    }

    /* ----- box helper ----- */
    _box(c, x0, x1, y0, y1, z0, z1, col, opt) {
      opt = opt || {};
      const P = (x, y, z) => this.project(x, y, z);
      const A = P(x0, y1, z0), B = P(x1, y1, z0), C = P(x1, y0, z0), D = P(x0, y0, z0);
      const E = P(x0, y1, z1), F = P(x1, y1, z1), G = P(x1, y0, z1), Hp = P(x0, y0, z1);
      if (!A || !B || !C || !D || !E || !F || !G || !Hp) return null;
      const amb = this.amb;
      const topC = shade(col, clamp(amb * 1.32 + 0.2, 0.18, 1.5));
      const nearC = shade(col, clamp(amb * 1.0 + 0.14, 0.14, 1.2));
      const sideC = shade(col, clamp(amb * 0.66 + 0.1, 0.1, 0.95));

      const poly = (pts, fill) => { c.beginPath(); c.moveTo(pts[0].sx, pts[0].sy); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].sx, pts[i].sy); c.closePath(); c.fillStyle = fill; c.fill(); };

      // top
      poly([A, B, F, E], rgb(topC));
      // side (camera at x=0 sees the face nearest the centre line)
      const midX = (x0 + x1) / 2;
      const sidePts = midX > 0 ? [A, E, Hp, D] : [B, F, G, C];
      poly(sidePts, rgb(sideC));
      // near face
      poly([A, B, C, D], rgb(nearC));

      const minx = Math.min(A.sx, B.sx, D.sx, E.sx, F.sx, Hp.sx);
      const maxx = Math.max(A.sx, B.sx, D.sx, E.sx, F.sx, Hp.sx);
      const miny = Math.min(A.sy, B.sy, E.sy, F.sy);
      const maxy = Math.max(C.sy, D.sy, G.sy, Hp.sy);
      return { minx, maxx, miny, maxy, A, B, C, D, E, F, G, H: Hp, sidePts, midX, scale: A.s };
    }

    /* ----- whole scene, painter-sorted ----- */
    _drawScene(c) {
      const items = [];
      for (const b of this.buildings) items.push({ z: b.z1, kind: 'b', ref: b });
      for (const p of this.props) items.push({ z: p.z, kind: 'p', ref: p });
      for (const a of this.actors) items.push({ z: a.z, kind: 'a', ref: a });
      items.sort((u, v) => v.z - u.z);

      this.detections = [];
      for (const it of items) {
        if (it.z > 230 || it.z < this.nearZ) continue;
        let bbox = null;
        if (it.kind === 'b') bbox = this._drawBuilding(c, it.ref);
        else if (it.kind === 'p') bbox = this._drawProp(c, it.ref);
        else bbox = this._drawActor(c, it.ref);
        if (bbox) this._drawHaze(c, bbox, it.z);
      }
    }

    _drawHaze(c, bb, z) {
      const k = clamp((z - 42) / 150, 0, 1);
      if (k <= 0.01) return;
      const a = k * (this.o.weather === 'fog' ? 0.95 : 0.8);
      c.fillStyle = rgb(this.horizonColor, a);
      c.fillRect(bb.minx - 2, bb.miny - 2, (bb.maxx - bb.minx) + 4, (bb.maxy - bb.miny) + 4);
    }

    _drawBuilding(c, b) {
      const amb = this.amb;
      const col = shade(b.base, amb * 0.86 + 0.2);
      const x1 = b.x1;
      const x2 = x1 + (b.side > 0 ? b.w : -b.w);
      const P = (x, y, z) => this.project(x, y, z);
      const nB0 = P(x1, 0, b.z1), nB1 = P(x2, 0, b.z1);
      const nT0 = P(x1, b.h, b.z1), nT1 = P(x2, b.h, b.z1);
      const fB1 = P(x2, 0, b.z2), fT1 = P(x2, b.h, b.z2);
      if (!nB0 || !nB1 || !nT0 || !nT1 || !fB1 || !fT1) return null;

      // side face (facing the road)
      c.beginPath();
      c.moveTo(nB0.sx, nB0.sy); c.lineTo(nT0.sx, nT0.sy);
      const sB2 = P(x1, 0, b.z2), sT2 = P(x1, b.h, b.z2);
      if (sB2 && sT2) { c.lineTo(sT2.sx, sT2.sy); c.lineTo(sB2.sx, sB2.sy); }
      c.closePath();
      c.fillStyle = rgb(shade(col, 0.74)); c.fill();

      // near face (facing camera)
      c.beginPath();
      c.moveTo(nB0.sx, nB0.sy); c.lineTo(nB1.sx, nB1.sy);
      c.lineTo(nT1.sx, nT1.sy); c.lineTo(nT0.sx, nT0.sy);
      c.closePath();
      c.fillStyle = rgb(col); c.fill();

      // roof edge
      c.beginPath();
      c.moveTo(nT0.sx, nT0.sy); c.lineTo(nT1.sx, nT1.sy); c.lineTo(fT1.sx, fT1.sy);
      if (sT2) { c.lineTo(sT2.sx, sT2.sy); }
      c.closePath();
      c.fillStyle = rgb(shade(col, 1.16)); c.fill();

      // shop front
      if (b.shop) {
        const g0 = P(x1 + (b.side > 0 ? 0.02 : -0.02), 0, b.z1 + 0.1);
        const g1 = P(x2, 0, b.z1 + 0.1);
        const g2 = P(x2, 2.6, b.z1 + 0.1);
        const g3 = P(x1 + (b.side > 0 ? 0.02 : -0.02), 2.6, b.z1 + 0.1);
        if (g0 && g1 && g2 && g3) {
          c.beginPath(); c.moveTo(g0.sx, g0.sy); c.lineTo(g1.sx, g1.sy); c.lineTo(g2.sx, g2.sy); c.lineTo(g3.sx, g3.sy); c.closePath();
          c.fillStyle = rgb(shade(b.shopColor, amb * 0.8 + 0.25), 0.92); c.fill();
        }
      }

      // windows on the near face
      const wr = mulberry32(b.litSeed);
      const rows = b.winRows, cols = b.winCols;
      const spanX = nB1.sx - nB0.sx, spanY = nB0.sy - nT0.sy;
      if (Math.abs(spanX) > 12 && Math.abs(spanY) > 12) {
        for (let ry = 0; ry < rows; ry++) {
          for (let cx2 = 0; cx2 < cols; cx2++) {
            const lit = this.night && wr() < 0.34;
            const u0 = (cx2 + 0.22) / cols, u1 = (cx2 + 0.78) / cols;
            const v0 = (ry + 0.24) / rows, v1 = (ry + 0.74) / rows;
            const x0 = nB0.sx + spanX * u0, x1w = nB0.sx + spanX * u1;
            const yTop = nT0.sy + spanY * (1 - v1), yBot = nT0.sy + spanY * (1 - v0);
            const slant = (nT1.sy - nT0.sy);
            c.beginPath();
            c.moveTo(x0, yTop + slant * u0); c.lineTo(x1w, yTop + slant * u1);
            c.lineTo(x1w, yBot + slant * u1); c.lineTo(x0, yBot + slant * u0);
            c.closePath();
            c.fillStyle = lit ? 'rgba(255,206,120,0.9)' : rgb(shade(col, this.night ? 0.42 : 0.56), 0.85);
            c.fill();
          }
        }
      }
      return { minx: Math.min(nB0.sx, nB1.sx, fB1.sx), maxx: Math.max(nB0.sx, nB1.sx, fB1.sx), miny: Math.min(nT0.sy, nT1.sy, fT1.sy), maxy: Math.max(nB0.sy, nB1.sy) };
    }

    _drawProp(c, p) {
      const amb = this.amb;
      if (p.kind === 'lamp') {
        const bx = p.side * (this.roadHalf + 1.35);
        const base = this.project(bx, 0, p.z), top = this.project(bx, p.h, p.z);
        if (!base || !top) return null;
        const wpx = Math.max(0.7, 0.13 * base.s);
        c.strokeStyle = rgb(shade([92, 96, 102], amb * 0.9 + 0.2));
        c.lineWidth = wpx; c.beginPath(); c.moveTo(base.sx, base.sy); c.lineTo(top.sx, top.sy); c.stroke();
        // arm over the road
        const armX = bx - p.side * 2.4;
        const arm = this.project(armX, p.h - 0.25, p.z);
        if (arm) {
          c.lineWidth = Math.max(0.6, 0.1 * base.s);
          c.beginPath(); c.moveTo(top.sx, top.sy); c.quadraticCurveTo((top.sx + arm.sx) / 2, top.sy - 3, arm.sx, arm.sy); c.stroke();
          const lr = Math.max(1.1, 0.3 * base.s);
          c.fillStyle = this.night ? 'rgba(255,226,160,0.98)' : rgb(shade([150, 152, 150], amb + 0.3));
          c.beginPath(); c.ellipse(arm.sx, arm.sy + lr * 0.3, lr * 1.5, lr * 0.75, 0, 0, 6.284); c.fill();
          if (this.night) {
            const g = c.createRadialGradient(arm.sx, arm.sy, 0, arm.sx, arm.sy, lr * 16);
            g.addColorStop(0, 'rgba(255,214,140,0.36)'); g.addColorStop(1, 'rgba(255,214,140,0)');
            c.fillStyle = g; c.beginPath(); c.arc(arm.sx, arm.sy, lr * 16, 0, 6.284); c.fill();
          }
          return { minx: Math.min(base.sx, arm.sx) - lr, maxx: Math.max(base.sx, arm.sx) + lr, miny: top.sy - lr, maxy: base.sy };
        }
        return { minx: base.sx - wpx, maxx: base.sx + wpx, miny: top.sy, maxy: base.sy };
      }

      if (p.kind === 'signal') {
        const bx = p.side * (this.roadHalf + 0.9);
        const base = this.project(bx, 0, p.z), top = this.project(bx, p.h, p.z);
        if (!base || !top) return null;
        const sig = this.signalState();
        const state = p.side < 0 ? sig.away : sig.toward;
        c.strokeStyle = rgb(shade([70, 74, 80], amb + 0.2));
        c.lineWidth = Math.max(0.8, 0.11 * base.s);
        c.beginPath(); c.moveTo(base.sx, base.sy); c.lineTo(top.sx, top.sy); c.stroke();
        const hw = Math.max(2.2, 0.42 * top.s), hh = hw * 2.5;
        const hx = top.sx - (p.side < 0 ? -hw * 0.4 : hw * 1.4);
        c.fillStyle = rgb(shade([28, 30, 34], amb + 0.35));
        c.fillRect(hx, top.sy - hh * 0.2, hw, hh);
        const cols = { red: '#ff3b30', amber: '#ffb020', green: '#24d17d' };
        const rr = hw * 0.3;
        ['red', 'amber', 'green'].forEach((k, i) => {
          const cy = top.sy - hh * 0.2 + hh * (0.19 + i * 0.31);
          const on = state === k;
          c.beginPath(); c.arc(hx + hw / 2, cy, rr, 0, 6.284);
          c.fillStyle = on ? cols[k] : rgb(shade([40, 42, 46], amb + 0.4));
          c.fill();
          if (on && this.night) {
            const hx2 = parseInt(cols[k].slice(1, 3), 16), hy2 = parseInt(cols[k].slice(3, 5), 16), hz2 = parseInt(cols[k].slice(5, 7), 16);
            const g = c.createRadialGradient(hx + hw / 2, cy, 0, hx + hw / 2, cy, rr * 7);
            g.addColorStop(0, `rgba(${hx2},${hy2},${hz2},0.4)`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.beginPath(); c.arc(hx + hw / 2, cy, rr * 7, 0, 6.284); c.fill();
          }
        });
        return { minx: hx - 2, maxx: hx + hw + 2, miny: top.sy - hh * 0.25, maxy: base.sy };
      }

      if (p.kind === 'sign') {
        const bx = p.side * (this.roadHalf + 1.05);
        const base = this.project(bx, 0, p.z), top = this.project(bx, p.h, p.z);
        if (!base || !top) return null;
        c.strokeStyle = rgb(shade([110, 112, 116], amb + 0.2));
        c.lineWidth = Math.max(0.6, 0.07 * base.s);
        c.beginPath(); c.moveTo(base.sx, base.sy); c.lineTo(top.sx, top.sy); c.stroke();
        const s = Math.max(3, 0.62 * top.s);
        c.save(); c.translate(top.sx, top.sy - s * 0.4);
        if (p.type === 'limit') {
          c.beginPath(); c.arc(0, 0, s, 0, 6.284); c.fillStyle = rgb(shade([238, 238, 234], amb + 0.3)); c.fill();
          c.lineWidth = Math.max(0.8, s * 0.22); c.strokeStyle = '#c62828'; c.stroke();
          if (s > 6) { c.fillStyle = '#1a1a1a'; c.font = `700 ${Math.round(s * 0.82)}px ui-monospace,monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.text, 0, s * 0.06); }
        } else if (p.type === 'stop') {
          c.beginPath();
          for (let i = 0; i < 8; i++) { const a2 = (i / 8) * 6.284; const px = Math.cos(a2) * s, py = Math.sin(a2) * s; i ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.closePath(); c.fillStyle = '#b3261e'; c.fill();
          if (s > 7) { c.fillStyle = '#fff'; c.font = `800 ${Math.round(s * 0.5)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', 0, 0); }
        } else {
          c.fillStyle = rgb(shade([24, 92, 150], amb + 0.35));
          c.fillRect(-s * 1.3, -s * 0.7, s * 2.6, s * 1.4);
        }
        c.restore();
        return { minx: top.sx - s * 1.5, maxx: top.sx + s * 1.5, miny: top.sy - s * 2, maxy: base.sy };
      }

      if (p.kind === 'tree') {
        const bx = p.side * (this.roadHalf + 2.6);
        const base = this.project(bx, 0, p.z), top = this.project(bx, p.h, p.z);
        if (!base || !top) return null;
        const amb2 = this.amb;
        c.strokeStyle = rgb(shade([74, 56, 38], amb2 + 0.2));
        c.lineWidth = Math.max(0.7, 0.16 * base.s);
        c.beginPath(); c.moveTo(base.sx, base.sy); c.lineTo(top.sx + p.lean * 6, top.sy); c.stroke();
        const cr = Math.max(2, (base.sy - top.sy) * 0.52);
        const green = this.night ? [22, 40, 26] : [46, 82, 40];
        for (let i = 0; i < 4; i++) {
          const a2 = i * 1.7;
          c.beginPath();
          c.arc(top.sx + Math.cos(a2) * cr * 0.4, top.sy + Math.sin(a2) * cr * 0.28, cr * (0.62 + (i % 2) * 0.2), 0, 6.284);
          c.fillStyle = rgb(shade(green, amb2 * 0.9 + 0.28 + i * 0.05), 0.96);
          c.fill();
        }
        return { minx: top.sx - cr, maxx: top.sx + cr, miny: top.sy - cr, maxy: base.sy };
      }
      return null;
    }

    _drawActor(c, a) {
      // ground shadow
      const g0 = this.project(a.x, 0, a.z);
      if (!g0) return null;
      const sw = Math.max(1, (a.wid * 0.85) * g0.s), sl = Math.max(1.5, (a.len * 0.55) * g0.s);
      c.save();
      c.globalAlpha = this.night ? 0.34 : 0.42;
      c.fillStyle = '#000';
      c.beginPath(); c.ellipse(g0.sx, g0.sy, sw, sl * 0.42, 0, 0, 6.284); c.fill();
      c.restore();

      if (a.type === 'person') return this._drawPerson(c, a);
      if (a.type === 'boda' || a.type === 'bicycle') return this._drawMoto(c, a);
      return this._drawVehicle(c, a);
    }

    _drawPerson(c, p) {
      const h = p.hgt;
      const swing = Math.sin(p.phase) * 0.22;
      const base = this.project(p.x, 0, p.z);
      if (!base) return null;
      const px = base.s;
      if (px * h < 2.2) return null;
      const skin = shade(p.skin, this.amb * 0.9 + 0.25);
      const cloth = shade(p.color, this.amb * 0.9 + 0.25);

      const hip = this.project(p.x, h * 0.5, p.z);
      const sho = this.project(p.x, h * 0.8, p.z);
      const head = this.project(p.x, h, p.z);
      if (!hip || !sho || !head) return null;

      // legs
      c.strokeStyle = rgb(shade(cloth, 0.72));
      c.lineWidth = Math.max(0.8, h * 0.1 * px);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(hip.sx, hip.sy);
      c.lineTo(hip.sx + swing * h * 0.34 * px, base.sy);
      c.moveTo(hip.sx, hip.sy);
      c.lineTo(hip.sx - swing * h * 0.34 * px, base.sy);
      c.stroke();
      // torso
      c.strokeStyle = rgb(cloth);
      c.lineWidth = Math.max(1.2, h * 0.24 * px);
      c.beginPath(); c.moveTo(hip.sx, hip.sy); c.lineTo(sho.sx, sho.sy); c.stroke();
      // arms
      c.strokeStyle = rgb(shade(cloth, 0.86));
      c.lineWidth = Math.max(0.7, h * 0.075 * px);
      c.beginPath();
      c.moveTo(sho.sx, sho.sy); c.lineTo(sho.sx - swing * h * 0.24 * px, hip.sy + (hip.sy - sho.sy) * 0.2);
      c.moveTo(sho.sx, sho.sy); c.lineTo(sho.sx + swing * h * 0.24 * px, hip.sy + (hip.sy - sho.sy) * 0.2);
      c.stroke();
      // head
      c.fillStyle = rgb(skin);
      c.beginPath(); c.arc(head.sx, head.sy + h * 0.045 * px, Math.max(0.9, h * 0.1 * px), 0, 6.284); c.fill();

      return { minx: head.sx - h * 0.3 * px, maxx: head.sx + h * 0.3 * px, miny: head.sy - h * 0.1 * px, maxy: base.sy, actor: p };
    }

    _drawMoto(c, a) {
      const l = a.len, w = a.wid, h = a.hgt;
      const z0 = a.z - l / 2, z1 = a.z + l / 2;
      const bodyY = h * 0.42;
      const amb = this.amb;
      const frameCol = shade(a.color, amb * 0.9 + 0.2);

      // wheels
      const wf = this.project(a.x, h * 0.17, z0 + l * 0.08);
      const wr = this.project(a.x, h * 0.17, z1 - l * 0.08);
      if (wf && wr) {
        c.fillStyle = rgb(shade([22, 22, 25], amb + 0.2));
        const rr = Math.max(0.9, h * 0.17 * wf.s);
        c.beginPath(); c.ellipse(wf.sx, wf.sy, rr * 0.55, rr, 0, 0, 6.284); c.fill();
        c.beginPath(); c.ellipse(wr.sx, wr.sy, rr * 0.55, rr, 0, 0, 6.284); c.fill();
      }
      // body / fairing
      const bb = this._box(c, a.x - w / 2, a.x + w / 2, bodyY * 0.55, bodyY, z0 + l * 0.16, z1 - l * 0.1, frameCol);
      // rider
      const riderCol = shade(pick(mulberry32(a.id), CLOTH), amb * 0.9 + 0.24);
      const skin = shade(pick(mulberry32(a.id + 7), SKIN), amb * 0.9 + 0.26);
      const hipP = this.project(a.x, h * 0.62, a.z + l * 0.06);
      const shoP = this.project(a.x, h * 0.86, a.z - l * 0.04);
      const hdP = this.project(a.x, h * 1.0, a.z - l * 0.06);
      if (hipP && shoP && hdP) {
        c.strokeStyle = rgb(riderCol);
        c.lineWidth = Math.max(1.1, h * 0.2 * hipP.s);
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(hipP.sx, hipP.sy); c.lineTo(shoP.sx, shoP.sy); c.stroke();
        c.strokeStyle = rgb(shade(riderCol, 0.85));
        c.lineWidth = Math.max(0.7, h * 0.075 * hipP.s);
        c.beginPath(); c.moveTo(shoP.sx, shoP.sy); c.lineTo(shoP.sx + w * 0.42 * hipP.s, shoP.sy + h * 0.1 * hipP.s); c.moveTo(shoP.sx, shoP.sy); c.lineTo(shoP.sx - w * 0.42 * hipP.s, shoP.sy + h * 0.1 * hipP.s); c.stroke();
        // helmet
        c.fillStyle = rgb(shade([236, 236, 232], amb + 0.25));
        c.beginPath(); c.arc(hdP.sx, hdP.sy, Math.max(1, h * 0.105 * hdP.s), 0, 6.284); c.fill();
        c.fillStyle = rgb(shade(skin, 0.8), 0.9);
        c.beginPath(); c.arc(hdP.sx, hdP.sy + h * 0.05 * hdP.s, Math.max(0.7, h * 0.06 * hdP.s), 0, 6.284); c.fill();
      }
      // pillion passenger on many boda bodas
      if (a.id % 3 === 0) {
        const ph = this.project(a.x, h * 0.92, a.z + l * 0.34);
        const pb = this.project(a.x, h * 0.6, a.z + l * 0.34);
        if (ph && pb) {
          c.strokeStyle = rgb(shade(pick(mulberry32(a.id + 3), CLOTH), amb * 0.9 + 0.24));
          c.lineWidth = Math.max(1, h * 0.19 * pb.s);
          c.beginPath(); c.moveTo(pb.sx, pb.sy); c.lineTo(ph.sx, ph.sy); c.stroke();
          c.fillStyle = rgb(shade([230, 230, 226], amb + 0.25));
          c.beginPath(); c.arc(ph.sx, ph.sy - h * 0.07 * ph.s, Math.max(0.9, h * 0.095 * ph.s), 0, 6.284); c.fill();
        }
      }
      // headlight / taillight
      this._lights(c, a, bb);
      if (!bb) return null;
      bb.actor = a;
      this._plate(c, a, bb);
      return bb;
    }

    _drawVehicle(c, a) {
      const l = a.len, w = a.wid, h = a.hgt;
      const z0 = a.z - l / 2, z1 = a.z + l / 2;
      const amb = this.amb;
      const body = shade(a.color, amb * 0.94 + 0.2);
      const cabinH = a.type === 'truck' ? h * 0.62 : a.type === 'bus' || a.type === 'minibus' ? h * 0.94 : h * 0.6;

      // chassis / lower body
      const bb = this._box(c, a.x - w / 2, a.x + w / 2, 0.28, cabinH, z0, z1, body);
      if (!bb) return null;

      const P = (x, y, z) => this.project(x, y, z);

      // cab / roof for cars & SUVs
      if (a.type === 'car' || a.type === 'suv' || a.type === 'pickup') {
        const roofZ0 = z0 + l * (a.type === 'pickup' ? 0.42 : 0.26);
        const roofZ1 = z1 - l * (a.type === 'pickup' ? 0.06 : 0.2);
        const roofY = a.type === 'pickup' ? h * 0.86 : h;
        this._box(c, a.x - w * 0.46, a.x + w * 0.46, cabinH, roofY, roofZ0, roofZ1, shade(body, 0.94));
        // glazing on near face
        const g0 = P(a.x - w * 0.42, cabinH + (roofY - cabinH) * 0.16, roofZ0 - 0.02);
        const g1 = P(a.x + w * 0.42, cabinH + (roofY - cabinH) * 0.16, roofZ0 - 0.02);
        const g2 = P(a.x + w * 0.42, roofY - (roofY - cabinH) * 0.14, roofZ0 - 0.02);
        const g3 = P(a.x - w * 0.42, roofY - (roofY - cabinH) * 0.14, roofZ0 - 0.02);
        if (g0 && g1 && g2 && g3) {
          c.beginPath(); c.moveTo(g0.sx, g0.sy); c.lineTo(g1.sx, g1.sy); c.lineTo(g2.sx, g2.sy); c.lineTo(g3.sx, g3.sy); c.closePath();
          const glass = this.night ? [44, 52, 66] : [112, 132, 152];
          c.fillStyle = rgb(shade(glass, amb * 0.8 + 0.4), 0.94); c.fill();
        }
        // side glazing
        const midX = a.x > 0 ? a.x - w * 0.46 : a.x + w * 0.46;
        const s0 = P(midX, cabinH + (roofY - cabinH) * 0.18, roofZ0 + 0.1);
        const s1 = P(midX, cabinH + (roofY - cabinH) * 0.18, roofZ1 - 0.1);
        const s2 = P(midX, roofY - (roofY - cabinH) * 0.16, roofZ1 - 0.1);
        const s3 = P(midX, roofY - (roofY - cabinH) * 0.16, roofZ0 + 0.1);
        if (s0 && s1 && s2 && s3) {
          c.beginPath(); c.moveTo(s0.sx, s0.sy); c.lineTo(s1.sx, s1.sy); c.lineTo(s2.sx, s2.sy); c.lineTo(s3.sx, s3.sy); c.closePath();
          c.fillStyle = rgb(shade(this.night ? [38, 46, 58] : [96, 116, 136], amb * 0.8 + 0.36), 0.92); c.fill();
        }
      } else {
        // bus / minibus / truck window band
        const bandY0 = cabinH * (a.type === 'truck' ? 0.5 : 0.42);
        const bandY1 = cabinH * (a.type === 'truck' ? 0.88 : 0.86);
        const wz0 = a.type === 'truck' ? z0 : z0 + l * 0.06;
        const wz1 = a.type === 'truck' ? z0 + l * 0.34 : z1 - l * 0.05;
        const midX = a.x > 0 ? a.x - w / 2 - 0.01 : a.x + w / 2 + 0.01;
        const s0 = P(midX, bandY0, wz0), s1 = P(midX, bandY0, wz1), s2 = P(midX, bandY1, wz1), s3 = P(midX, bandY1, wz0);
        if (s0 && s1 && s2 && s3) {
          c.beginPath(); c.moveTo(s0.sx, s0.sy); c.lineTo(s1.sx, s1.sy); c.lineTo(s2.sx, s2.sy); c.lineTo(s3.sx, s3.sy); c.closePath();
          c.fillStyle = rgb(shade(this.night ? [40, 48, 60] : [86, 106, 126], amb * 0.8 + 0.4), 0.92); c.fill();
          // window dividers
          c.strokeStyle = rgb(shade(body, 0.9), 0.8);
          c.lineWidth = Math.max(0.4, 0.05 * s0.s);
          const n = Math.max(2, Math.floor((wz1 - wz0) / 1.5));
          for (let i = 1; i < n; i++) {
            const zz = lerp(wz0, wz1, i / n);
            const q0 = P(midX, bandY0, zz), q1 = P(midX, bandY1, zz);
            if (q0 && q1) { c.beginPath(); c.moveTo(q0.sx, q0.sy); c.lineTo(q1.sx, q1.sy); c.stroke(); }
          }
        }
        // truck container
        if (a.type === 'truck') {
          this._box(c, a.x - w * 0.49, a.x + w * 0.49, 0.5, h * 0.95, z0 + l * 0.3, z1, shade(pick(mulberry32(a.id + 11), [[196, 196, 192], [140, 50, 42], [40, 74, 110], [70, 96, 62]]), amb * 0.9 + 0.2));
        }
        if (a.type === 'truck' || a.type === 'bus' || a.type === 'minibus') {
          // near-face windscreen
          const f0 = P(a.x - w * 0.42, bandY0, z0 - 0.02), f1 = P(a.x + w * 0.42, bandY0, z0 - 0.02);
          const f2 = P(a.x + w * 0.42, bandY1, z0 - 0.02), f3 = P(a.x - w * 0.42, bandY1, z0 - 0.02);
          if (f0 && f1 && f2 && f3) {
            c.beginPath(); c.moveTo(f0.sx, f0.sy); c.lineTo(f1.sx, f1.sy); c.lineTo(f2.sx, f2.sy); c.lineTo(f3.sx, f3.sy); c.closePath();
            c.fillStyle = rgb(shade(this.night ? [40, 48, 60] : [92, 112, 132], amb * 0.8 + 0.42), 0.94); c.fill();
          }
        }
      }

      // taxi band (Ugandan matatu livery)
      if (a.taxi) {
        const midX = a.x > 0 ? a.x - w / 2 - 0.02 : a.x + w / 2 + 0.02;
        const b0 = P(midX, cabinH * 0.2, z0 + 0.2), b1 = P(midX, cabinH * 0.2, z1 - 0.2);
        const b2 = P(midX, cabinH * 0.42, z1 - 0.2), b3 = P(midX, cabinH * 0.42, z0 + 0.2);
        if (b0 && b1 && b2 && b3) {
          c.beginPath(); c.moveTo(b0.sx, b0.sy); c.lineTo(b1.sx, b1.sy); c.lineTo(b2.sx, b2.sy); c.lineTo(b3.sx, b3.sy); c.closePath();
          c.fillStyle = rgb(shade(TAXI_BAND, amb * 0.9 + 0.25), 0.95); c.fill();
        }
      }
      if (a.police) {
        const lp = P(a.x, cabinH + 0.12, a.z);
        if (lp) {
          const blink = Math.sin(this.t * 9) > 0;
          c.fillStyle = blink ? '#2f6bff' : '#ff2d2d';
          const s = Math.max(1.1, 0.2 * lp.s);
          c.fillRect(lp.sx - s * 1.6, lp.sy - s * 0.6, s * 3.2, s * 1.2);
          if (this.night) {
            const g = c.createRadialGradient(lp.sx, lp.sy, 0, lp.sx, lp.sy, s * 12);
            g.addColorStop(0, blink ? 'rgba(60,110,255,0.35)' : 'rgba(255,60,60,0.35)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.beginPath(); c.arc(lp.sx, lp.sy, s * 12, 0, 6.284); c.fill();
          }
        }
      }

      // wheels
      const wheelR = Math.min(h * 0.24, l * 0.11);
      const midX2 = a.x > 0 ? a.x - w / 2 - 0.02 : a.x + w / 2 + 0.02;
      for (const wz of [z0 + l * 0.2, z1 - l * 0.2]) {
        const wp = P(midX2, wheelR, wz);
        if (!wp) continue;
        c.fillStyle = rgb(shade([16, 16, 19], amb + 0.18));
        c.beginPath(); c.ellipse(wp.sx, wp.sy, Math.max(0.8, wheelR * wp.s * 0.62), Math.max(1, wheelR * wp.s), 0, 0, 6.284); c.fill();
      }

      this._lights(c, a, bb);
      bb.actor = a;
      this._plate(c, a, bb);
      return bb;
    }

    _lights(c, a, bb) {
      if (!bb) return;
      const amb = this.amb;
      const { A, B, C, D } = bb;
      const wpx = Math.max(1, (B.sx - A.sx) * 0.12);
      const hpx = Math.max(0.9, (C.sy - B.sy) * 0.16);
      const yL = lerp(B.sy, C.sy, 0.3);
      const front = a.dir < 0;   // travelling toward camera => we see the front
      if (front) {
        const on = this.night || amb < 0.6;
        for (const t of [0.16, 0.84]) {
          const lx = lerp(A.sx, B.sx, t);
          c.fillStyle = on ? 'rgba(255,248,214,0.98)' : rgb(shade([210, 214, 216], amb + 0.3));
          c.beginPath(); c.ellipse(lx, yL, wpx * 0.62, hpx * 0.5, 0, 0, 6.284); c.fill();
          if (on) {
            const g = c.createRadialGradient(lx, yL, 0, lx, yL, wpx * 7);
            g.addColorStop(0, 'rgba(255,244,206,0.4)'); g.addColorStop(1, 'rgba(255,244,206,0)');
            c.fillStyle = g; c.beginPath(); c.arc(lx, yL, wpx * 7, 0, 6.284); c.fill();
          }
        }
      } else {
        const br = a.brakeLight > 0.35;
        for (const t of [0.14, 0.86]) {
          const lx = lerp(A.sx, B.sx, t);
          c.fillStyle = br ? 'rgba(255,48,38,1)' : 'rgba(178,42,36,0.92)';
          c.beginPath(); c.ellipse(lx, yL, wpx * 0.55, hpx * 0.44, 0, 0, 6.284); c.fill();
          if (br && this.night) {
            const g = c.createRadialGradient(lx, yL, 0, lx, yL, wpx * 6);
            g.addColorStop(0, 'rgba(255,40,30,0.42)'); g.addColorStop(1, 'rgba(255,40,30,0)');
            c.fillStyle = g; c.beginPath(); c.arc(lx, yL, wpx * 6, 0, 6.284); c.fill();
          }
        }
      }
      // headlight beam on the road at night
      if (this.night && a.dir < 0 && a.z > 12 && a.z < 95) {
        const gp = this.project(a.x, 0, a.z + 11);
        const bp = this.project(a.x, 0, a.z - 1);
        if (gp && bp) {
          c.save();
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(gp.sx, gp.sy, bp.sx, bp.sy);
          g.addColorStop(0, 'rgba(255,240,200,0)');
          g.addColorStop(1, 'rgba(255,240,200,0.14)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(gp.sx - (bp.sx - gp.sx) * 0.02 - 6, gp.sy);
          c.lineTo(gp.sx + 6, gp.sy);
          c.lineTo(bp.sx + (B.sx - A.sx) * 0.7, bp.sy);
          c.lineTo(bp.sx - (B.sx - A.sx) * 0.7, bp.sy);
          c.closePath(); c.fill();
          c.restore();
        }
      }
    }

    _plate(c, a, bb) {
      if (!a.plate || !bb) return;
      const wpx = bb.maxx - bb.minx;
      if (wpx < 26) return;
      const { A, B, C, D } = bb;
      const pw = (B.sx - A.sx) * 0.34, ph = Math.max(3, (C.sy - B.sy) * 0.17);
      if (pw < 13 || ph < 4) return;
      const cxp = (A.sx + B.sx) / 2, cyp = lerp(B.sy, C.sy, 0.76);
      c.save();
      c.fillStyle = a.type === 'truck' || a.type === 'bus' ? '#f2e6c8' : '#f6f7f4';
      c.fillRect(cxp - pw / 2, cyp - ph / 2, pw, ph);
      c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 0.6;
      c.strokeRect(cxp - pw / 2, cyp - ph / 2, pw, ph);
      const fs = Math.min(ph * 0.72, 11);
      if (fs > 3.4) {
        c.fillStyle = '#111';
        c.font = `700 ${fs.toFixed(1)}px ui-monospace, monospace`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        let txt = a.plate;
        while (c.measureText(txt).width > pw - 2 && txt.length > 4) txt = txt.slice(0, -1);
        c.fillText(txt, cxp, cyp + 0.5);
      }
      c.restore();
    }

    /* ----- weather / night / grain ----- */
    _drawWeather(c, W, H) {
      const o = this.o;
      if (o.weather === 'rain') {
        c.save();
        c.strokeStyle = 'rgba(190,210,230,0.32)';
        c.lineWidth = 1;
        const n = o.quality === 'high' ? 130 : 60;
        for (let i = 0; i < n; i++) {
          const x = ((i * 97.3 + this.t * 620) % (W + 80)) - 40;
          const y = ((i * 53.7 + this.t * 1180) % (H + 60)) - 30;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3.2, y + 13); c.stroke();
        }
        c.restore();
        c.fillStyle = 'rgba(80,96,116,0.13)';
        c.fillRect(0, 0, W, H);
      } else if (o.weather === 'fog') {
        const g = c.createLinearGradient(0, this.horizonY - H * 0.1, 0, H);
        g.addColorStop(0, 'rgba(206,212,218,0.5)');
        g.addColorStop(0.55, 'rgba(206,212,218,0.2)');
        g.addColorStop(1, 'rgba(206,212,218,0.04)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      if (this.night) {
        c.fillStyle = 'rgba(6,10,24,0.34)';
        c.fillRect(0, 0, W, H);
      }
    }

    _drawNightLight(c) {
      // warm pools under street lamps
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const p of this.props) {
        if (p.kind !== 'lamp' || p.z > 110) continue;
        const gp = this.project(p.side * (this.roadHalf - 1.2), 0, p.z);
        if (!gp) continue;
        const rad = Math.max(6, 7.5 * gp.s);
        const g = c.createRadialGradient(gp.sx, gp.sy, 0, gp.sx, gp.sy, rad);
        g.addColorStop(0, 'rgba(255,196,110,0.16)');
        g.addColorStop(1, 'rgba(255,196,110,0)');
        c.fillStyle = g;
        c.beginPath(); c.ellipse(gp.sx, gp.sy, rad, rad * 0.34, 0, 0, 6.284); c.fill();
      }
      c.restore();
    }

    _applyIR(c, W, H) {
      // CCTV cameras switch to IR at night: desaturate + cool tint
      try {
        c.save();
        c.globalCompositeOperation = 'color';
        c.fillStyle = '#808080';
        c.fillRect(0, 0, W, H);
        c.restore();
      } catch (e) { /* unsupported */ }
      c.save();
      c.globalCompositeOperation = 'overlay';
      c.fillStyle = 'rgba(120,140,170,0.1)';
      c.fillRect(0, 0, W, H);
      c.restore();
    }

    _drawGrain(c, W, H) {
      if (!this.noiseTile) {
        const n = document.createElement('canvas');
        n.width = 96; n.height = 96;
        const nc = n.getContext('2d');
        const img = nc.createImageData(96, 96);
        const rr = mulberry32(4242);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 110 + rr() * 130;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 26;
        }
        nc.putImageData(img, 0, 0);
        this.noiseTile = n;
      }
      c.save();
      const ox = -Math.random() * 96, oy = -Math.random() * 96;
      const pat = c.createPattern(this.noiseTile, 'repeat');
      c.globalAlpha = this.night ? 0.5 : 0.3;
      c.translate(ox, oy);
      c.fillStyle = pat;
      c.fillRect(-ox, -oy, W, H);
      c.restore();
    }

    /* ----- AI overlay ----- */
    _drawAI(c) {
      const dets = [];
      const W = this.W;
      for (const a of this.actors) {
        if (a.z < 5 || a.z > 150) continue;
        const p = this.project(a.x, a.hgt || 1.7, a.z);
        const g = this.project(a.x, 0, a.z);
        if (!p || !g) continue;
        const hpx = g.sy - p.sy;
        if (hpx < 9) continue;
        const T = TYPES[a.type] || { cls: 'OBJECT', vuln: false };
        const wpx = a.type === 'person' ? hpx * 0.42 : Math.max(hpx * 0.5, (a.wid * 1.25) * g.s);
        let x0 = p.sx - wpx / 2, x1 = p.sx + wpx / 2;
        let y0 = p.sy - hpx * 0.06, y1 = g.sy + hpx * 0.02;
        if (a.type !== 'person') {
          const lenPx = Math.max(hpx * 0.4, (a.len * 0.6) * g.s);
          x0 = Math.min(x0, p.sx - lenPx / 2); x1 = Math.max(x1, p.sx + lenPx / 2);
        }
        if (x1 < -20 || x0 > W + 20) continue;

        let violating = a.wrongSide || a.flagged.speed || a.flagged.red || a.flagged.ovt || a.flagged.hit;
        let col = T.vuln ? '#ffc93c' : '#4ee79d';
        if (violating) col = '#ff4d4d';
        if (a.police) col = '#3ba7ff';

        dets.push({
          id: a.id, cls: T.cls, plate: a.plate, conf: a.conf,
          x0, y0, x1, y1, col, violating,
          speed: a.type === 'person' ? null : Math.round(Math.abs(a.vz) * 3.6),
          z: a.z, sx: p.sx, sy: p.sy
        });

        a.trail.push({ x: p.sx, y: g.sy });
        if (a.trail.length > 16) a.trail.shift();
      }
      this.detections = dets;

      const showLabels = this.o.aiLabels && this.W > 210;
      c.save();
      c.lineWidth = Math.max(1, this.W / 620);

      // lane detection guide
      if (this.o.laneGuides !== false && this.o.quality !== 'low' && this.W > 320) {
        c.save();
        c.setLineDash([6, 7]);
        c.strokeStyle = 'rgba(255,201,60,0.34)';
        c.lineWidth = Math.max(1, this.W / 900);
        for (const lx of [-this.roadHalf + 0.2, 0, this.roadHalf - 0.2]) {
          const a1 = this.project(lx, 0, 12), a2 = this.project(lx, 0, 150);
          if (a1 && a2) { c.beginPath(); c.moveTo(a1.sx, a1.sy); c.lineTo(a2.sx, a2.sy); c.stroke(); }
        }
        c.restore();
      }

      dets.sort((u, v) => v.z - u.z);
      const budget = this.o.quality === 'high' ? 18 : this.o.quality === 'mid' ? 12 : 9;
      let drawn = 0;
      const labelRects = [];
      const labelCap = this.o.quality === 'high' ? 7 : 4;
      let labels = 0;
      const overlaps = r => labelRects.some(q => !(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1));

      // object tracking trails
      if (this.o.quality !== 'low') {
        c.save();
        c.lineWidth = Math.max(0.8, this.W / 900);
        for (const a of this.actors) {
          if (!a.trail || a.trail.length < 3) continue;
          c.strokeStyle = a.flagged.hit || a.wrongSide ? 'rgba(255,77,77,0.5)' : 'rgba(120,220,255,0.34)';
          c.beginPath();
          c.moveTo(a.trail[0].x, a.trail[0].y);
          for (let i = 1; i < a.trail.length; i++) c.lineTo(a.trail[i].x, a.trail[i].y);
          c.stroke();
        }
        c.restore();
      }

      for (const d of dets) {
        if (drawn >= budget) break;
        drawn++;
        const w = d.x1 - d.x0, h = d.y1 - d.y0;
        c.strokeStyle = d.col;
        c.globalAlpha = 0.82;
        // corner-bracket style box (professional CV look, not a solid rectangle)
        const k = Math.min(w, h) * 0.26;
        c.beginPath();
        c.moveTo(d.x0, d.y0 + k); c.lineTo(d.x0, d.y0); c.lineTo(d.x0 + k, d.y0);
        c.moveTo(d.x1 - k, d.y0); c.lineTo(d.x1, d.y0); c.lineTo(d.x1, d.y0 + k);
        c.moveTo(d.x1, d.y1 - k); c.lineTo(d.x1, d.y1); c.lineTo(d.x1 - k, d.y1);
        c.moveTo(d.x0 + k, d.y1); c.lineTo(d.x0, d.y1); c.lineTo(d.x0, d.y1 - k);
        c.stroke();
        c.globalAlpha = 0.09;
        c.fillStyle = d.col;
        c.fillRect(d.x0, d.y0, w, h);
        c.globalAlpha = 1;

        if (!showLabels) continue;
        // far or small objects get a bracket only — labels stay readable and uncluttered
        if (labels >= labelCap || h < 24) continue;
        const fs = clamp(this.W / 92, 6.5, 11);
        c.font = `700 ${fs}px ui-monospace, monospace`;
        const label = d.cls + ' ' + d.conf.toFixed(2);
        const tw = c.measureText(label).width + 8;
        const ly = d.y0 - fs - 4 < 2 ? d.y1 + 2 : d.y0 - fs - 4;
        const rect = { x0: d.x0, y0: ly, x1: d.x0 + tw, y1: ly + fs + 4 };
        if (overlaps(rect)) continue;
        labelRects.push(rect);
        labels++;
        c.fillStyle = 'rgba(4,6,10,0.66)';
        c.fillRect(rect.x0, rect.y0, tw, fs + 4);
        c.fillStyle = d.col;
        c.fillRect(rect.x0, rect.y0, 2, fs + 4);
        c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillText(label, rect.x0 + 5, rect.y0 + 2);
        if (d.plate && w > 56 && this.o.quality !== 'low' && (d.violating || d.z < 45)) {
          const pw2 = c.measureText(d.plate).width + 8;
          const py = rect.y0 + fs + 5;
          const prect = { x0: d.x0, y0: py, x1: d.x0 + pw2, y1: py + fs + 3 };
          if (!overlaps(prect)) {
            labelRects.push(prect);
            c.fillStyle = 'rgba(4,6,10,0.66)';
            c.fillRect(prect.x0, prect.y0, pw2, fs + 3);
            c.fillStyle = '#ffe08a';
            c.fillText(d.plate, prect.x0 + 4, prect.y0 + 2);
          }
        }
        if (d.speed !== null && (d.violating || d.z < 34) && this.o.quality !== 'low') {
          c.font = `600 ${Math.max(6, fs - 1.5)}px ui-monospace, monospace`;
          const stxt = d.speed + ' km/h';
          const sw = c.measureText(stxt).width;
          // only draw the speed readout when it won't collide with the label chip
          if (d.x1 - (rect.x0 + tw) > sw + 8) {
            c.fillStyle = d.violating ? '#ff8080' : 'rgba(255,255,255,0.72)';
            c.textAlign = 'right';
            c.fillText(stxt, d.x1, rect.y0 + 2);
            c.textAlign = 'left';
          }
        }
      }
      c.restore();
    }

    /* ----- HUD text drawn inside the canvas ----- */
    drawHUD(ts) {
      const c = this.ctx, o = this.o;
      if (!this.W) return;
      const fs = clamp(this.W / 46, 8, 15);
      c.save();
      c.font = `700 ${fs}px ui-monospace, monospace`;
      c.textBaseline = 'top';
      const d = new Date();
      const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      // top-left: cam id + view + REC
      c.textAlign = 'left';
      const blink = Math.floor(ts / 500) % 2 === 0;
      const l1 = `${o.camId}  ${o.view === 'rear' ? 'REAR' : 'FRONT'}`;
      const l1w = c.measureText(l1).width;
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(6, 6, l1w + (blink ? 30 : 14), fs + 8);
      c.fillStyle = '#fff';
      c.fillText(l1, 12, 10);
      if (blink) {
        c.fillStyle = '#ff4d4d';
        c.beginPath(); c.arc(12 + l1w + 8, 10 + fs * 0.42, fs * 0.3, 0, 6.284); c.fill();
        c.fillStyle = 'rgba(255,110,110,0.95)';
        c.fillText('REC', 12 + l1w + 8 + fs * 0.5, 10);
      }
      c.font = `600 ${Math.max(6, fs - 2.5)}px ui-monospace, monospace`;
      c.fillStyle = 'rgba(255,255,255,0.82)';
      c.fillText(o.location.toUpperCase(), 12, 12 + fs + 2);

      // bottom-left timestamp + gps
      c.textAlign = 'left';
      c.font = `600 ${Math.max(6, fs - 1.5)}px ui-monospace, monospace`;
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(6, this.H - fs * 2 - 14, Math.max(c.measureText(stamp).width, c.measureText(o.gps).width) + 14, fs * 2 + 10);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fillText(stamp, 12, this.H - fs * 2 - 10);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillText(o.gps, 12, this.H - fs - 6);

      // bottom-right: SIMULATED marker
      c.textAlign = 'right';
      c.fillStyle = 'rgba(255,201,60,0.9)';
      c.font = `700 ${Math.max(6, fs - 2)}px ui-monospace, monospace`;
      c.fillText('SIMULATED FEED', this.W - 12, this.H - fs - 6);
      c.restore();
    }

    /* ----- public API ----- */
    start() { if (!this.running) { this.running = true; this.lastFrame = performance.now(); } }
    stop() { this.running = false; }
    destroy() { this.running = false; PTMSim._unregister(this); }

    setOptions(o) {
      Object.assign(this.o, o);
      if ('zoom' in o || 'panX' in o || 'quality' in o) this.resize();
    }
    nudge(dx, dy) {
      this.o.panX = clamp(this.o.panX + dx, -1.4, 1.4);
      this.o.zoom = clamp(this.o.zoom + dy, 0.7, 2.4);
      this.ptzKick = 0.4;
      this.resize();
    }

    capture(width, quality) {
      width = width || 640;
      const ratio = this.H / (this.W || 1);
      const t = document.createElement('canvas');
      t.width = width; t.height = Math.round(width * ratio);
      const tc = t.getContext('2d');
      tc.fillStyle = '#04050a'; tc.fillRect(0, 0, t.width, t.height);
      tc.drawImage(this.canvas, 0, 0, t.width, t.height);
      return t.toDataURL('image/jpeg', quality || 0.62);
    }

    getStats() { return Object.assign({}, this.lastStats, { fps: this.fps }); }
    getDetections() { return this.detections; }

    stepTo(seconds) {
      const dt = 1 / 30;
      let n = Math.max(0, Math.floor(seconds / dt));
      this.o.emitEvents = false;
      while (n-- > 0) this.step(dt);
      this.o.emitEvents = true;
    }
  }

  /* ---------- global frame loop ---------- */
  PTMSim._sims = [];
  PTMSim._raf = null;
  PTMSim._last = 0;
  PTMSim._listeners = [];

  PTMSim._register = function (s) {
    PTMSim._sims.push(s);
    if (PTMSim._observe) PTMSim._observe(s.canvas);
    if (!PTMSim._raf) { PTMSim._last = performance.now(); PTMSim._raf = requestAnimationFrame(PTMSim._loop); }
  };
  PTMSim._unregister = function (s) {
    const i = PTMSim._sims.indexOf(s);
    if (i >= 0) PTMSim._sims.splice(i, 1);
    if (!PTMSim._sims.length && PTMSim._raf) { cancelAnimationFrame(PTMSim._raf); PTMSim._raf = null; }
  };
  PTMSim.onEvent = function (fn) { PTMSim._listeners.push(fn); };
  PTMSim.offEvent = function (fn) { const i = PTMSim._listeners.indexOf(fn); if (i >= 0) PTMSim._listeners.splice(i, 1); };
  PTMSim.emitGlobal = function (ev, sim) { for (const fn of PTMSim._listeners.slice()) { try { fn(ev, sim); } catch (e) { console.error(e); } } };

  PTMSim._loop = function (now) {
    PTMSim._raf = requestAnimationFrame(PTMSim._loop);
    const dtReal = Math.min(0.12, (now - PTMSim._last) / 1000);
    PTMSim._last = now;
    for (const s of PTMSim._sims) {
      if (!s.running || !s.visible) continue;
      if (!s.canvas.isConnected) { s.stop(); continue; }
      if (now - s.lastFrame < s._frameMs) continue;
      const dt = Math.min(0.1, (now - s.lastFrame) / 1000);
      s.lastFrame = now;
      try {
        s.step(dt);
        s.render();
        s.drawHUD(now);
        s.fps = Math.round(1 / (dt || 1 / 30));
      } catch (e) { console.error('[PTMSim] frame error', e); s.stop(); }
    }
  };

  /* ---------- static helpers ---------- */
  // Render one deterministic still frame (used for evidence thumbnails)
  PTMSim.renderStill = function (canvas, opts) {
    const o = Object.assign({ quality: 'low', ai: true, at: 0, jitter: false }, opts || {});
    const at = o.at || 0; delete o.at;
    const sim = new PTMSim(canvas, o);
    sim.resize();
    sim.stepTo(at);
    sim.render();
    sim.drawHUD(performance.now());
    sim.destroy();
    return sim;
  };

  PTMSim.all = function () { return PTMSim._sims.slice(); };
  PTMSim.pauseAll = function (v) { PTMSim._sims.forEach(s => { s.visible = !v; }); };

  // Auto-pause off-screen simulations
  if ('IntersectionObserver' in global) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const s = PTMSim._sims.find(x => x.canvas === e.target);
        if (s) s.visible = e.isIntersecting;
      }
    }, { rootMargin: '120px' });
    PTMSim._observe = function (canvas) { io.observe(canvas); };
  } else {
    PTMSim._observe = function () {};
  }

  global.PTMSim = PTMSim;
})(window);
