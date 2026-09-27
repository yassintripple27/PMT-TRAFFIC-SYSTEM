import { SIM_EPOCH, clamp, dateStamp, int, mulberry32, pad, pick, rnd, stamp, type Rng } from "@/lib/util";

export interface District {
  city: string;
  lon: number;
  lat: number;
  weight: number;
}

export interface Camera {
  id: string;
  road: string;
  location: string;
  district: string;
  lon: number;
  lat: number;
  gps: string;
  type: string;
  online: boolean;
  congestion: boolean;
  density: number;
  weather: string;
  hour: number;
  speedLimit: number;
  seed: number;
  anpr: boolean;
  pedestrianZone: boolean;
  intersection: boolean;
  installed: string;
  firmware: string;
  lastPing: number;
}

export interface Vehicle {
  plate: string;
  make: string;
  model: string;
  color: string;
  class: "MOTORCYCLE" | "HEAVY" | "LIGHT";
  registered: string;
  owner: string;
  district: string;
  insurance: "VALID" | "EXPIRED";
  seed: number;
}

export type CaseStatus =
  | "PAID"
  | "UNPAID"
  | "PENDING VERIFICATION"
  | "RESOLVED"
  | "PAYMENT PENDING";

export interface TrafficCase {
  id: string;
  camId: string;
  location: string;
  district: string;
  gps: string;
  plate: string;
  make: string;
  model: string;
  color: string;
  vehicleType: string;
  violation: string;
  violationLabel: string;
  severity: "critical" | "warning";
  ts: number;
  date: string;
  time: string;
  speed: number;
  speedLimit: number;
  confidence: number;
  status: CaseStatus;
  penalty: number;
  verifiedBy: string | null;
  evidenceFrames: number;
  seed: number;
  hour: number;
}

export interface ViolationRule {
  key: string;
  label: string;
  enabled: boolean;
  severity: "critical" | "warning";
  penalty: number;
  confidence: number;
  note: string;
}

export interface Incident {
  id: string;
  type: string;
  typeLabel: string;
  severity: "critical" | "warning" | "info";
  camId: string;
  location: string;
  district: string;
  gps: string;
  lon: number;
  lat: number;
  ts: number;
  plate: string | null;
  vehicleType?: string;
  speed?: number;
  confidence?: number;
  detail?: string;
  violation?: string;
  units: number;
  status: "RESPONDING" | "ON SCENE" | "PENDING VERIFICATION" | "RESOLVED";
  assignedUnit: string | null;
  distanceKm?: number;
  seed: number;
}

export interface Device {
  id: string;
  type: string;
  label: string;
  proto: string;
  district: string;
  location: string;
  lon: number;
  lat: number;
  online: boolean;
  battery: number | null;
  power: string;
  firmware: string;
  lastPing: number;
  uptime: number;
  txRate: number;
  health: "HEALTHY" | "DEGRADED" | "FAULT";
  lang: string;
}

export interface Officer {
  id: string;
  name: string;
  officerId: string;
  role: string;
  station: string;
  active: boolean;
  twoFA: boolean;
  lastLogin: number;
  created: string;
}

export interface AuditEntry {
  id: string;
  ts: number;
  action: string;
  actor: string;
  role: string;
  detail: Record<string, unknown>;
}

export const DISTRICTS: District[] = [
  { city: "Kampala", lon: 32.5825, lat: 0.3471, weight: 9 },
  { city: "Wakiso", lon: 32.4594, lat: 0.4044, weight: 4 },
  { city: "Mukono", lon: 32.7553, lat: 0.3533, weight: 3 },
  { city: "Entebbe", lon: 32.4469, lat: 0.0644, weight: 3 },
  { city: "Jinja", lon: 33.2041, lat: 0.4244, weight: 3 },
  { city: "Mbarara", lon: 30.6545, lat: -0.6072, weight: 2 },
  { city: "Mbale", lon: 34.175, lat: 1.0827, weight: 2 },
  { city: "Gulu", lon: 32.299, lat: 2.7747, weight: 2 },
  { city: "Fort Portal", lon: 30.275, lat: 0.67, weight: 2 },
  { city: "Masaka", lon: 31.7333, lat: -0.3333, weight: 2 },
  { city: "Arua", lon: 30.91, lat: 3.02, weight: 1 },
  { city: "Kabale", lon: 29.99, lat: -1.2417, weight: 1 },
  { city: "Lira", lon: 32.5389, lat: 2.2417, weight: 2 },
  { city: "Tororo", lon: 34.1819, lat: 0.6931, weight: 1 },
  { city: "Soroti", lon: 33.6117, lat: 1.7136, weight: 1 },
  { city: "Hoima", lon: 31.35, lat: 1.4333, weight: 1 },
  { city: "Kasese", lon: 30.0833, lat: 0.1833, weight: 1 },
];

export const ROADS: Record<string, string[]> = {
  Kampala: [
    "Kampala Road", "Jinja Road", "Entebbe Road", "Northern Bypass", "Kampala City Centre",
    "Ntinda Road", "Wandegeya Road", "Kira Road", "Buganda Road",
    "Residential Road — Kololo", "Owino Market Junction", "Busega Junction",
  ],
  Wakiso: ["Northern Bypass — Nansana", "Entebbe Express Link", "Bulenga Junction"],
  Mukono: ["Mukono Township Road", "Kampala–Jinja Highway (Mukono)"],
  Entebbe: ["Entebbe Road", "Entebbe Airport Approach", "Kitoro Road"],
  Jinja: ["Jinja Road", "Jinja CBD", "Jinja–Kampala Highway"],
  Mbarara: ["Mbarara Road", "Mbarara High Street", "Mbarara–Kabale Highway"],
  Mbale: ["Mbale Road", "Mbale Town Centre"],
  Gulu: ["Gulu Road", "Gulu Town Centre", "Gulu–Juba Highway"],
  "Fort Portal": ["Fort Portal Road", "Fort Portal–Kasese Highway"],
  Masaka: ["Masaka Road", "Masaka Town Centre"],
  Arua: ["Arua Road", "Arua Town Centre"],
  Kabale: ["Kabale Road", "Kabale Town Centre"],
  Lira: ["Lira Road", "Lira Town Centre"],
  Tororo: ["Tororo Road", "Tororo Town Centre"],
  Soroti: ["Soroti Road", "Soroti Town Centre"],
  Hoima: ["Hoima Road", "Hoima Town Centre"],
  Kasese: ["Kasese Road", "Kasese Town Centre"],
};

export const CAM_TYPES = [
  "ANPR Camera",
  "Dome PTZ Camera",
  "Fixed Traffic Camera",
  "Corridor Speed Camera",
  "Junction Multi-Sensor",
  "Pedestrian Zone Camera",
];

const WEATHERS = ["clear", "clear", "clear", "rain", "fog", "clear", "rain"];

export const FLEET_TOTAL = 248;
export const FLEET_OFFLINE = 17;

export const DEFAULT_RULES: ViolationRule[] = [
  { key: "RED_LIGHT", label: "Red-light violation", enabled: true, severity: "critical", penalty: 400000, confidence: 0.9, note: "Crossing the stop line while the signal shows red." },
  { key: "SPEED", label: "Speeding", enabled: true, severity: "warning", penalty: 300000, confidence: 0.88, note: "Exceeding the configured zone limit by more than 30%." },
  { key: "WRONG_SIDE", label: "Wrong-side driving", enabled: true, severity: "critical", penalty: 500000, confidence: 0.86, note: "Vehicle travelling against the flow of its carriageway." },
  { key: "OVERTAKE", label: "Dangerous overtaking", enabled: true, severity: "critical", penalty: 450000, confidence: 0.84, note: "Overtaking across the centre line into oncoming traffic." },
  { key: "ILLEGAL_PARKING", label: "Illegal parking", enabled: true, severity: "warning", penalty: 150000, confidence: 0.82, note: "Stationary vehicle inside a marked no-parking zone." },
  { key: "ILLEGAL_UTURN", label: "Illegal U-turn", enabled: true, severity: "warning", penalty: 200000, confidence: 0.8, note: "U-turn where prohibited by signage or road marking." },
  { key: "INTERSECTION_BLOCK", label: "Blocking an intersection", enabled: true, severity: "warning", penalty: 180000, confidence: 0.78, note: "Entering a junction without a clear exit." },
  { key: "SIGN_DISOBEY", label: "Failure to obey a traffic sign", enabled: true, severity: "warning", penalty: 160000, confidence: 0.8, note: "Ignoring STOP / yield / mandatory-direction signage." },
  { key: "PEDESTRIAN_ZONE", label: "Vehicle in a pedestrian zone", enabled: true, severity: "critical", penalty: 350000, confidence: 0.83, note: "Motor vehicle or motorcycle inside a restricted pedestrian area." },
  { key: "LANE_DISCIPLINE", label: "Unsafe lane change", enabled: false, severity: "warning", penalty: 120000, confidence: 0.74, note: "Lane change without sufficient gap. Disabled — requires human verification." },
  { key: "BODA_HELMET", label: "Motorcycle rider without helmet", enabled: false, severity: "warning", penalty: 100000, confidence: 0.7, note: "Disabled by default: AI confidence below enforcement threshold." },
];

export const ROLES = [
  { key: "SUPER_ADMIN", label: "Super Admin", desc: "Full control of users, roles, rules, devices, evidence and audit history.", perms: ["*"] },
  { key: "TRAFFIC_ADMIN", label: "Traffic Admin", desc: "Manages traffic zones, detection rules, violations, fines and reports.", perms: ["cameras", "rules", "violations", "fines", "analytics", "incidents", "reports"] },
  { key: "COMMANDER", label: "Commander", desc: "Oversees incidents and units, authorises dispatch and case verification.", perms: ["cameras", "incidents", "verify", "dispatch", "analytics", "violations"] },
  { key: "POLICE_OFFICER", label: "Police Officer", desc: "Views assigned incidents, nearby cameras and live traffic for their jurisdiction.", perms: ["cameras", "incidents", "live"] },
  { key: "PAYMENT_OFFICER", label: "Payment Officer", desc: "Processes fine payments, issues receipts and reconciles case balances.", perms: ["fines", "payments", "receipts"] },
  { key: "SYSTEM_TECHNICIAN", label: "System Technician", desc: "Maintains cameras, IoT devices, network health and edge firmware.", perms: ["iot", "cameras", "health"] },
];

export const INCIDENT_TYPES = [
  { key: "ACCIDENT", label: "Road traffic accident", sev: "critical" as const },
  { key: "VIOLATION", label: "Traffic violation", sev: "critical" as const },
  { key: "CONGESTION", label: "Traffic congestion", sev: "warning" as const },
  { key: "OBSTRUCTION", label: "Road obstruction", sev: "warning" as const },
  { key: "EMERGENCY", label: "Emergency / ambulance corridor", sev: "critical" as const },
  { key: "PEDESTRIAN", label: "Pedestrian safety alert", sev: "warning" as const },
  { key: "SIGNAL_FAULT", label: "Traffic signal fault", sev: "info" as const },
  { key: "DEVICE", label: "Camera offline", sev: "info" as const },
];

export const DEVICE_TYPES = [
  { key: "CAMERA", label: "Smart Traffic Camera", icon: "cam", proto: "MQTT / TLS" },
  { key: "SPEED", label: "Radar Speed Sensor", icon: "radar", proto: "MQTT" },
  { key: "SIGNAL", label: "Traffic Light Sensor", icon: "signal", proto: "Modbus → MQTT" },
  { key: "GPS", label: "Vehicle GPS Unit", icon: "gps", proto: "MQTT" },
  { key: "ROAD", label: "Road Surface Sensor", icon: "road", proto: "LoRaWAN" },
  { key: "EDGE", label: "Edge AI Compute Node", icon: "chip", proto: "gRPC / TLS" },
  { key: "WEATHER", label: "Weather Station", icon: "cloud", proto: "MQTT" },
];

const GEO = {
  lonMin: 29.25,
  lonMax: 35.25,
  latMax: 4.55,
  latMin: -1.75,
  vbW: 1000,
  vbH: 700,
  padX: 56,
  padY: 40,
};

export function project(lon: number, lat: number) {
  const x = GEO.padX + ((lon - GEO.lonMin) / (GEO.lonMax - GEO.lonMin)) * (GEO.vbW - GEO.padX * 2);
  const y = GEO.padY + ((GEO.latMax - lat) / (GEO.latMax - GEO.latMin)) * (GEO.vbH - GEO.padY * 2);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export const MAP_VIEWBOX = `0 0 ${GEO.vbW} ${GEO.vbH}`;

export const UG_BORDER: [number, number][] = [
  [30.83, 3.79], [31.2, 3.86], [31.85, 3.78], [32.35, 3.8], [33.05, 3.96], [33.42, 3.8],
  [34.0, 4.24], [34.48, 3.84], [34.62, 3.28], [35.0, 1.92], [34.58, 1.58], [34.2, 1.1],
  [34.46, 0.6], [34.06, 0.26], [33.92, -0.12], [34.06, -1.06], [33.0, -1.0], [31.8, -1.1],
  [31.0, -1.16], [30.5, -1.1], [29.86, -1.36], [29.57, -1.1], [29.55, -0.58], [29.86, -0.2],
  [30.1, 0.1], [29.84, 0.56], [30.2, 0.86], [30.86, 1.1], [31.16, 1.62], [30.84, 2.2],
  [30.9, 2.86], [30.58, 3.3],
];

export const LAKES: Record<string, [number, number][]> = {
  victoria: [[31.6, -0.4], [32.2, -0.1], [32.9, 0.05], [33.6, -0.15], [34.0, -0.6], [33.9, -1.05], [33.2, -1.0], [32.4, -0.95], [31.8, -0.9], [31.55, -0.7]],
  albert: [[30.55, 1.15], [30.9, 1.45], [31.1, 1.95], [30.95, 2.3], [30.62, 2.1], [30.42, 1.6]],
  kyoga: [[32.4, 1.3], [33.1, 1.42], [33.6, 1.55], [33.4, 1.78], [32.8, 1.7], [32.35, 1.55]],
  edward: [[29.9, -0.2], [30.2, -0.05], [30.15, 0.3], [29.85, 0.15]],
  george: [[30.2, -0.05], [30.42, 0.02], [30.38, 0.15], [30.18, 0.1]],
};

export function polyPath(pts: [number, number][]): string {
  return (
    pts
      .map((p, i) => {
        const q = project(p[0], p[1]);
        return `${i ? "L" : "M"}${q.x} ${q.y}`;
      })
      .join(" ") + " Z"
  );
}

export const BORDER_PATH = polyPath(UG_BORDER);
export const LAKE_PATHS = Object.entries(LAKES).map(([name, pts]) => ({
  name,
  d: polyPath(pts),
}));

function buildCameras(): Camera[] {
  const r = mulberry32(20260921);
  const totalWeight = DISTRICTS.reduce((s, d) => s + d.weight, 0);
  const exact = DISTRICTS.map((d) => (d.weight * FLEET_TOTAL) / totalWeight);
  const quota = exact.map(Math.floor);
  let assigned = quota.reduce((s, x) => s + x, 0);
  const byRemainder = DISTRICTS.map((_, i) => i).sort(
    (a, b) => exact[b] - quota[b] - (exact[a] - quota[a]),
  );
  for (let i = 0; assigned < FLEET_TOTAL; i++) {
    quota[byRemainder[i % byRemainder.length]]++;
    assigned++;
  }

  const cams: Camera[] = [];
  const made = DISTRICTS.map(() => 0);
  let n = 0;
  let remaining = FLEET_TOTAL;
  let guard = 0;
  while (remaining > 0 && guard++ < 100000) {
    for (let di = 0; di < DISTRICTS.length && remaining > 0; di++) {
      if (made[di] >= quota[di]) continue;
      const d = DISTRICTS[di];
      const i = made[di]++;
      remaining--;
      n++;
      const roads = ROADS[d.city] || [`${d.city} Road`];
      const road = roads[i % roads.length];
      const k = i % 3;
      const lon = d.lon + (r() - 0.5) * 0.075;
      const lat = d.lat + (r() - 0.5) * 0.068;
      const hourBucket = r();
      cams.push({
        id: `CAM-${pad(n, 3)}`,
        road,
        location: road + (k === 1 ? " — North" : k === 2 ? " — South" : ""),
        district: d.city,
        lon,
        lat,
        gps: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}, ${lon.toFixed(4)}°E`,
        type: pick(r, CAM_TYPES),
        online: true,
        congestion: r() < 0.16,
        density: clamp(0.28 + r() * 0.72, 0.2, 1),
        weather: pick(r, WEATHERS),
        hour:
          hourBucket < 0.2
            ? rnd(r, 6.2, 8.4)
            : hourBucket < 0.42
              ? rnd(r, 11, 14)
              : hourBucket < 0.72
                ? rnd(r, 16.6, 19.2)
                : rnd(r, 19.6, 23.4),
        speedLimit: pick(r, [40, 50, 60, 80]),
        seed: n * 7919 + 13,
        anpr: r() > 0.12,
        pedestrianZone: /residential|market|cbd/i.test(road),
        intersection: r() > 0.3,
        installed: `${2019 + Math.floor(r() * 6)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`,
        firmware: `v${pick(r, ["2.4.1", "2.4.3", "2.5.0", "2.6.2"])}`,
        lastPing: SIM_EPOCH - Math.floor(r() * 40000),
      });
    }
  }

  const offIdx = new Set<number>();
  while (offIdx.size < FLEET_OFFLINE) offIdx.add(Math.floor(r() * cams.length));
  offIdx.forEach((idx) => {
    cams[idx].online = false;
    cams[idx].congestion = false;
    cams[idx].lastPing = SIM_EPOCH - Math.floor(r() * 9000000);
  });

  return cams;
}

const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

export const CAMERAS = buildCameras();

export const cameraById = (id: string) => CAMERAS.find((c) => c.id === id);
export const onlineCameras = () => CAMERAS.filter((c) => c.online);
export const camerasByDistrict = (d: string) => CAMERAS.filter((c) => c.district === d);
export const featuredCameras = (count: number) => {
  const want = ["CAM-001", "CAM-002", "CAM-003", "CAM-004", "CAM-005", "CAM-006"];
  const out = want.map((id) => CAMERAS.find((c) => c.id === id)).filter(Boolean) as Camera[];
  const rest = CAMERAS.filter((c) => c.online && !out.includes(c));
  let i = 0;
  while (out.length < count && i < rest.length) out.push(rest[i++]);
  return out.slice(0, count);
};

export function searchCameras(q: string): Camera[] {
  const query = (q || "").trim().toLowerCase();
  if (!query) return CAMERAS;
  return CAMERAS.filter(
    (c) =>
      c.id.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.district.toLowerCase().includes(query) ||
      c.road.toLowerCase().includes(query) ||
      c.type.toLowerCase().includes(query) ||
      (c.online ? "online" : "offline").includes(query),
  );
}

export function makePlate(r: Rng): string {
  const a = LETTERS[Math.floor(r() * 23)];
  const b = LETTERS[Math.floor(r() * 23)];
  const c = LETTERS[Math.floor(r() * 23)];
  return `U${a}${b} ${Math.floor(rnd(r, 100, 999))}${c}`;
}

function buildVehicles(): Vehicle[] {
  const r = mulberry32(771);
  const makes = [
    ["Toyota", "Premio", "White"], ["Toyota", "Harrier", "Black"], ["Toyota", "Hiace", "White"],
    ["Toyota", "Corolla", "Silver"], ["Toyota", "Land Cruiser", "Dark Grey"], ["Nissan", "X-Trail", "Silver"],
    ["Nissan", "Wingroad", "White"], ["Mitsubishi", "Pajero", "Green"], ["Isuzu", "Elf Truck", "Blue"],
    ["Subaru", "Forester", "Maroon"], ["Mercedes-Benz", "C200", "Black"], ["Mazda", "Demio", "Red"],
    ["Honda", "Fit", "Grey"], ["Yamaha", "Boxer 100", "Red"], ["Bajaj", "Pulsar", "Black"],
    ["Tvs", "Apache", "Blue"], ["Volvo", "Bus", "White"], ["Scania", "Bus", "Yellow"],
  ];
  const out: Vehicle[] = [];
  for (let i = 0; i < 180; i++) {
    const m = pick(r, makes);
    const cls = /Yamaha|Bajaj|Tvs/.test(m[0])
      ? ("MOTORCYCLE" as const)
      : /Bus|Truck|Elf/.test(m[0] + m[1])
        ? ("HEAVY" as const)
        : ("LIGHT" as const);
    out.push({
      plate: makePlate(r),
      make: m[0],
      model: m[1],
      color: m[2],
      class: cls,
      registered: `${2015 + Math.floor(r() * 11)}`,
      owner: "REDACTED — access restricted by role",
      district: pick(r, DISTRICTS).city,
      insurance: r() > 0.22 ? "VALID" : "EXPIRED",
      seed: Math.floor(r() * 99999) + 3,
    });
  }
  return out;
}

export const VEHICLES = buildVehicles();

export const vehicleByPlate = (plate: string) =>
  VEHICLES.find(
    (v) => v.plate.replace(/\s/g, "").toLowerCase() === String(plate || "").replace(/\s/g, "").toLowerCase(),
  );

export const randomVehicle = (r: Rng = Math.random) => pick(r, VEHICLES);
export const randomPlate = (r: Rng = Math.random) => makePlate(r);

function buildCases(): TrafficCase[] {
  const r = mulberry32(4242);
  const rules = DEFAULT_RULES.filter((x) => x.enabled);
  const cases: TrafficCase[] = [];
  for (let i = 0; i < 62; i++) {
    const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
    const rule = rules[Math.floor(r() * rules.length)];
    const veh = VEHICLES[Math.floor(r() * VEHICLES.length)];
    const ts = SIM_EPOCH - Math.floor(r() * 1000 * 60 * 60 * 24 * 26);
    const d = new Date(ts);
    const roll = r();
    const status: CaseStatus =
      roll < 0.34 ? "PAID" : roll < 0.62 ? "UNPAID" : roll < 0.82 ? "PENDING VERIFICATION" : "RESOLVED";
    cases.push({
      id: `PTM-2026-${pad(100 + i, 6)}`,
      camId: cam.id,
      location: cam.location,
      district: cam.district,
      gps: cam.gps,
      plate: veh.plate,
      make: veh.make,
      model: veh.model,
      color: veh.color,
      vehicleType: veh.class === "MOTORCYCLE" ? "MOTORCYCLE" : veh.class === "HEAVY" ? "TRUCK/BUS" : "CAR",
      violation: rule.key,
      violationLabel: rule.label,
      severity: rule.severity,
      ts,
      date: dateStamp(d),
      time: stamp(d),
      speed: Math.round(rnd(r, 42, 118)),
      speedLimit: cam.speedLimit,
      confidence: Math.round(rnd(r, rule.confidence, 0.995) * 1000) / 1000,
      status,
      penalty: rule.penalty,
      verifiedBy:
        status === "PENDING VERIFICATION"
          ? null
          : pick(r, ["Ofc. R. Nakato", "Sgt. D. Okello", "Insp. A. Mugisha", "Ofc. J. Babirye", "Sgt. P. Auma"]),
      evidenceFrames: 5,
      seed: Math.floor(r() * 99999) + 11,
      hour: d.getHours() + d.getMinutes() / 60,
    });
  }
  cases.sort((a, b) => b.ts - a.ts);
  return cases;
}

export const CASES = buildCases();
export const caseById = (id: string) => CASES.find((c) => c.id === id);
export const enabledRules = () => DEFAULT_RULES.filter((r) => r.enabled);

function buildIncidents(): Incident[] {
  const r = mulberry32(31337);
  const out: Incident[] = [];
  for (let i = 0; i < 34; i++) {
    const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
    const t = pick(r, INCIDENT_TYPES);
    const ts = SIM_EPOCH - Math.floor(r() * 1000 * 60 * 240);
    const roll = r();
    out.push({
      id: `${t.key === "ACCIDENT" ? "PTM-ACC-" : "PTM-INC-"}${pad(1000 + i * 3 + Math.floor(r() * 3), 5)}`,
      type: t.key,
      typeLabel: t.label,
      severity: t.sev,
      camId: cam.id,
      location: cam.location,
      district: cam.district,
      gps: cam.gps,
      lon: cam.lon,
      lat: cam.lat,
      ts,
      plate: t.key === "VIOLATION" || t.key === "ACCIDENT" ? randomPlate(r) : null,
      units: Math.floor(r() * 3),
      status:
        roll < 0.3 ? "RESPONDING" : roll < 0.52 ? "ON SCENE" : roll < 0.74 ? "PENDING VERIFICATION" : "RESOLVED",
      assignedUnit: roll < 0.6 ? `UNIT PTM-${pad(int(r, 1, 60), 3)}` : null,
      distanceKm: Math.round(rnd(r, 0.4, 6.5) * 10) / 10,
      seed: Math.floor(r() * 99999) + 5,
    });
  }
  out.sort((a, b) => b.ts - a.ts);
  out.forEach((inc, idx) => {
    if (idx < 24) {
      const m = idx % 3;
      inc.status = m === 0 ? "RESPONDING" : m === 1 ? "ON SCENE" : "PENDING VERIFICATION";
      if (!inc.assignedUnit && m !== 2) inc.assignedUnit = `UNIT PTM-${pad(1 + ((idx * 7) % 60), 3)}`;
    } else {
      inc.status = "RESOLVED";
    }
  });
  return out;
}

export const INCIDENTS = buildIncidents();
export const activeIncidents = () => INCIDENTS.filter((i) => i.status !== "RESOLVED");

function buildDevices(): Device[] {
  const r = mulberry32(9091);
  const out: Device[] = [];
  let n = 0;
  for (const dt of DEVICE_TYPES) {
    const count = dt.key === "CAMERA" ? 60 : dt.key === "GPS" ? 34 : 22;
    for (let i = 0; i < count; i++) {
      n++;
      const cam = CAMERAS[Math.floor(r() * CAMERAS.length)];
      const online = r() > (dt.key === "CAMERA" ? 0.07 : 0.11);
      out.push({
        id: `${dt.key.slice(0, 3)}-${pad(n, 4)}`,
        type: dt.key,
        label: dt.label,
        proto: dt.proto,
        district: cam.district,
        location: cam.location,
        lon: cam.lon,
        lat: cam.lat,
        online,
        battery: dt.key === "GPS" || dt.key === "ROAD" ? int(r, 18, 100) : null,
        power: pick(r, ["GRID", "GRID", "SOLAR + BATTERY", "GRID"]),
        firmware: `fw-${pick(r, ["1.8.2", "1.9.0", "2.0.4", "2.1.1"])}`,
        lastPing: SIM_EPOCH - Math.floor(r() * (online ? 90000 : 26000000)),
        uptime: Math.round((90 + r() * 9.9) * 100) / 100,
        txRate: int(r, 1, 30),
        health: online ? (r() > 0.86 ? "DEGRADED" : "HEALTHY") : "FAULT",
        lang: dt.key === "EDGE" || dt.key === "CAMERA" ? "C / C++ (embedded)" : "C (firmware)",
      });
    }
  }
  return out;
}

export const DEVICES = buildDevices();
export const onlineDevices = () => DEVICES.filter((d) => d.online);
export const devicesByType = (t: string) => DEVICES.filter((d) => d.type === t);
export const faultyDevices = () =>
  DEVICES.filter((d) => !d.online || d.health === "FAULT" || d.health === "DEGRADED");

function buildOfficers(): Officer[] {
  const r = mulberry32(5150);
  const names: [string, string, string][] = [
    ["Rachel Nakato", "POLICE_OFFICER", "Kampala Central"],
    ["David Okello", "COMMANDER", "Gulu"],
    ["Aisha Mugisha", "TRAFFIC_ADMIN", "Kampala"],
    ["Joseph Babirye", "POLICE_OFFICER", "Jinja"],
    ["Patience Auma", "PAYMENT_OFFICER", "Mbarara"],
    ["Samuel Kibirige", "SYSTEM_TECHNICIAN", "National"],
    ["Grace Adongo", "POLICE_OFFICER", "Mbale"],
    ["Ivan Ssebaggala", "COMMANDER", "Kampala"],
    ["Miriam Kyomuhendo", "TRAFFIC_ADMIN", "Fort Portal"],
    ["Peter Ochom", "SYSTEM_TECHNICIAN", "Lira"],
    ["Florence Namutebi", "PAYMENT_OFFICER", "Masaka"],
    ["Brian Wasswa", "SUPER_ADMIN", "National"],
    ["Sarah Akello", "POLICE_OFFICER", "Arua"],
    ["Moses Rutaro", "POLICE_OFFICER", "Kabale"],
    ["Diana Birungi", "COMMANDER", "Mbarara"],
    ["Hassan Kato", "SYSTEM_TECHNICIAN", "Kampala"],
  ];
  return names.map((nm, i) => ({
    id: `PTM-U-${pad(i + 1, 3)}`,
    name: nm[0],
    officerId: `OF-${pad(2000 + i * 37, 5)}`,
    role: nm[1],
    station: nm[2],
    active: r() > 0.12,
    twoFA: r() > 0.18,
    lastLogin: SIM_EPOCH - Math.floor(r() * 1000 * 60 * 60 * 90),
    created: `${2021 + Math.floor(r() * 5)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`,
  }));
}

export const OFFICERS = buildOfficers();
export const officerById = (id: string) => OFFICERS.find((u) => u.id === id);
export const roleLabel = (key: string) => ROLES.find((r) => r.key === key)?.label || key;

export function series(seed: number, n: number, base: number, amp: number, noise: number) {
  const r = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const wave = Math.sin((i / n) * Math.PI * 2) * amp;
    const daily = Math.sin(((i % 24) / 24) * Math.PI * 2 - 1.2) * amp * 0.6;
    out.push(Math.max(0, Math.round(base + wave + daily + (r() - 0.5) * noise)));
  }
  return out;
}

export function hourlyTraffic(seed: number) {
  const r = mulberry32(seed);
  return Array.from({ length: 24 }, (_, h) => {
    const peak =
      Math.exp(-((h - 8.2) ** 2) / 5.5) + Math.exp(-((h - 18.4) ** 2) / 6.2) * 1.15;
    return Math.round(60 + peak * 780 + r() * 70);
  });
}

export function hourlyBoda(seed: number) {
  const r = mulberry32(seed + 9);
  return Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-((h - 9) ** 2) / 8) + Math.exp(-((h - 19) ** 2) / 7) * 1.3;
    return Math.round(40 + peak * 620 + r() * 60);
  });
}

export function violationsByLocation(seed: number) {
  const r = mulberry32(seed);
  return DISTRICTS.slice(0, 9)
    .map((d) => ({ label: d.city, value: Math.round((d.weight + 1) * (60 + r() * 260)) }))
    .sort((a, b) => b.value - a.value);
}

export function violationsByType(seed: number) {
  const r = mulberry32(seed);
  return DEFAULT_RULES.slice(0, 8).map((x) => ({
    label: x.label,
    value: Math.round(40 + r() * 640),
  }));
}

export const FLEET_KPI = {
  total: FLEET_TOTAL,
  offline: FLEET_OFFLINE,
  online: FLEET_TOTAL - FLEET_OFFLINE,
  districts: DISTRICTS.length,
  devices: DEVICES.length,
  devicesOnline: DEVICES.filter((d) => d.online).length,
};
