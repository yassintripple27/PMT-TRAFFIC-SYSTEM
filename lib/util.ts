export function mulberry32(a: number): () => number {
  let s = a | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];
export const rnd = (r: Rng, a: number, b: number) => a + r() * (b - a);
export const int = (r: Rng, a: number, b: number) => Math.floor(a + r() * (b - a + 1));

export const stamp = (d: Date = new Date()) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export const dateStamp = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const dateTime = (d: Date = new Date()) => `${dateStamp(d)} ${stamp(d)}`;

export const SIM_EPOCH = Date.parse("2026-09-27T14:32:10Z");

export function ago(ts: number, now: number = SIM_EPOCH): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const num = (n: number | string) => Number(n || 0).toLocaleString("en-US");
export const ugx = (n: number | string) => `UGX ${Number(n || 0).toLocaleString("en-US")}`;

export const uid = (prefix = "ID") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
