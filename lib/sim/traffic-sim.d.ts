export interface SimOptions {
  seed?: number;
  camId?: string;
  location?: string;
  district?: string;
  hour?: number;
  weather?: string;
  density?: number;
  ai?: boolean;
  aiLabels?: boolean;
  emitEvents?: boolean;
  quality?: "low" | "high";
  speedLimit?: number;
  view?: string;
  layout?: "road" | "residential";
  zoom?: number;
  panX?: number;
  jitter?: boolean;
  gps?: string;
  pedestrianZone?: boolean;
  intersection?: boolean;
  [key: string]: unknown;
}

export interface SimStats {
  vehicles: number;
  motorcycles: number;
  pedestrians: number;
  avgSpeed: number;
  condition: string;
  fps?: number;
}

/**
 * One projected detection box, in canvas pixels.
 * `cls` is the vehicle class ("CAR", "BUS", "PERSON", …) and `conf` the
 * detector confidence — these are the field names the simulation emits.
 */
export interface SimDetection {
  id: number;
  cls: string;
  plate?: string;
  conf: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  col: string;
  violating: boolean;
  speed: number | null;
  z: number;
  sx: number;
  sy: number;
}

/** An incident broadcast by the simulation. Note the timestamp field is
 *  `simTime` (seconds into the run) — the sim never emits `ts`. */
export interface SimEvent {
  type: string;
  severity: "critical" | "warning" | "info";
  detail: string;
  camId: string;
  location: string;
  district: string;
  plate: string | null;
  vehicleType: string;
  speed: number;
  confidence: number;
  simTime: number;
  gps: string;
  [key: string]: unknown;
}

export declare class PTMSim {
  constructor(canvas: HTMLCanvasElement, opts?: SimOptions);
  canvas: HTMLCanvasElement;
  running: boolean;
  visible: boolean;
  detections: SimDetection[];
  lastStats: SimStats;
  start(): void;
  stop(): void;
  destroy(): void;
  step(dt: number): void;
  stepTo(seconds: number): void;
  /** Pans and zooms the virtual camera. */
  nudge(dx: number, dy: number): void;
  capture(width?: number, quality?: number): string;
  resize(): void;
  getStats(): SimStats;
  getDetections(): SimDetection[];
  static onEvent(fn: (ev: SimEvent, sim: PTMSim) => void): void;
  static offEvent(fn: (ev: SimEvent, sim: PTMSim) => void): void;
  static emitGlobal(ev: SimEvent, sim: PTMSim): void;
  static renderStill(
    canvas: HTMLCanvasElement,
    opts: SimOptions & { seconds?: number },
  ): void;
  static all(): PTMSim[];
  static pauseAll(paused: boolean): void;
}

export default PTMSim;
