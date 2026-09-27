"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import SimStage from "@/components/sim/SimStage";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { Plate, StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, SegmentedControl, Toolbar } from "@/components/ui/Controls";
import { DonutChart, LineChart } from "@/components/ui/Charts";
import { useToasts } from "@/components/ui/Modal";
import { CAMERAS, DEFAULT_RULES, enabledRules, series } from "@/lib/data";
import type { SimDetection, SimStats } from "@/lib/sim/traffic-sim";
import { ago, num } from "@/lib/util";

/** Class names the simulation emits for each toolbar filter. */
const CLASS_GROUPS: Record<string, string[]> = {
  vehicle: ["CAR", "SUV", "PICKUP", "BUS", "MINIBUS", "TRUCK"],
  motorcycle: ["MOTORCYCLE", "BICYCLE"],
  pedestrian: ["PERSON"],
};

const MIX_PALETTE = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)", "var(--viz-6)"];

interface DetectionRow {
  key: string;
  /** Vehicle class from the sim (`cls`), e.g. "CAR", "BUS", "PERSON". */
  type: string;
  plate?: string;
  confidence: number;
  /** Top-left box origin, in canvas pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number | null;
  violating: boolean;
  camId: string;
  ts: number;
}

export default function AiDetectionPage() {
  const [camId, setCamId] = useState(CAMERAS[0].id);
  const [labels, setLabels] = useState(true);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<SimStats | null>(null);
  const [detections, setDetections] = useState<DetectionRow[]>([]);
  const [aiFilter, setAiFilter] = useState("ALL");
  const { items, push, dismiss } = useToasts();

  const cam = CAMERAS.find((c) => c.id === camId) ?? CAMERAS[0];

  const onStats = useCallback((s: SimStats) => setStats(s), []);

  const onDetection = useCallback((list: SimDetection[]) => {
    const now = Date.now();
    setDetections(
      list.slice(0, 24).map((d) => ({
        key: `${d.id}`,
        type: d.cls,
        plate: d.plate,
        confidence: d.conf,
        x: d.x0,
        y: d.y0,
        w: d.x1 - d.x0,
        h: d.y1 - d.y0,
        speed: d.speed,
        violating: d.violating,
        camId: CAMERAS[0]?.id ?? "CAM-001",
        ts: now,
      })),
    );
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const group = CLASS_GROUPS[aiFilter];
    return detections.filter(
      (d) =>
        (!group || group.includes(d.type)) &&
        (!q ||
          String(d.plate ?? "").toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q)),
    );
  }, [detections, query, aiFilter]);

  const throughput = useMemo(() => series(53, 20, 380, 120, 70), []);
  const precision = useMemo(() => series(59, 20, 90, 6, 4), []);

  const mix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of detections) counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    // Rank first, then colour by rank — otherwise the palette is handed out in
    // arrival order and the largest slice changes colour every frame.
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return ranked.map(([label, value], i) => ({
      label,
      value,
      color: MIX_PALETTE[i % MIX_PALETTE.length],
    }));
  }, [detections]);

  const columns: Column<DetectionRow>[] = [
    {
      key: "type",
      header: "Class",
      render: (d) => <span className="text-text">{d.type}</span>,
    },
    { key: "plate", header: "Plate", render: (d) => (d.plate ? <Plate>{d.plate}</Plate> : "—") },
    {
      key: "status",
      header: "Status",
      render: (d) =>
        d.violating ? (
          <StatusBadge status="VIOLATION" />
        ) : (
          <StatusBadge status="CLEAR" />
        ),
    },
    {
      key: "conf",
      header: "Confidence",
      render: (d) => <span className="font-mono text-gold">{Math.round(d.confidence * 100)}%</span>,
    },
    {
      key: "speed",
      header: "Speed",
      render: (d) =>
        d.speed == null ? "—" : <span className="font-mono">{Math.round(d.speed)} km/h</span>,
    },
    {
      key: "box",
      header: "Bounding box",
      render: (d) => (
        <span className="font-mono text-xs text-muted-2">
          {Math.round(d.x)},{Math.round(d.y)} {Math.round(d.w)}×{Math.round(d.h)}
        </span>
      ),
    },
    { key: "ts", header: "Frame", render: (d) => <span className="font-mono text-xs">{ago(d.ts)}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Pipeline", value: paused ? "PAUSED" : "RUNNING", tone: paused ? "blue" : "green" },
        { label: "Rules active", value: num(enabledRules().length), tone: "gold" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Computer vision</span>
          <h1 className="page-title">AI Detection Lab</h1>
          <p className="lead mt-4 max-w-3xl">
            Run the detection pipeline against any camera in the fleet, inspect live bounding boxes
            and confidence scores, and tune the {DEFAULT_RULES.length} detection rules that gate every
            enforcement case.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={paused ? "btn" : "btn btn-ghost"}
            onClick={() => {
              setPaused((p) => !p);
              push(paused ? "Detection pipeline resumed" : "Detection pipeline paused", paused ? "green" : "blue");
            }}
          >
            {paused ? "Resume pipeline" : "Pause pipeline"}
          </button>
          <Link href="/violations" className="btn">
            Review cases
          </Link>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Detections / h", value: num(throughput[throughput.length - 1]), sub: "pipeline", tone: "gold" },
          { label: "Precision", value: `${(precision[precision.length - 1] / 100).toFixed(2)}`, sub: "rolling mean", tone: "green" },
          { label: "Tracked now", value: num(detections.length), sub: "in frame", tone: "blue" },
          { label: "Rules active", value: `${enabledRules().length}/${DEFAULT_RULES.length}`, sub: "enforcement", tone: "gold" },
        ]}
      />

      <div className="console-grid sidebar mb-6">
        <div className="flex flex-col gap-6">
          <Panel title="Pipeline controls">
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">
                  Camera feed
                </p>
                <select
                  className="input w-full"
                  value={camId}
                  onChange={(e) => setCamId(e.target.value)}
                  aria-label="Camera feed"
                >
                  {CAMERAS.slice(0, 60).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.location}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="text-muted">Show AI labels &amp; bounding boxes</span>
                <input
                  type="checkbox"
                  checked={labels}
                  onChange={(e) => setLabels(e.target.checked)}
                  className="h-4 w-4 accent-[var(--viz-1)]"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-soft px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-2">Vehicles</p>
                  <p className="mt-1 font-mono text-lg font-bold text-text">{stats?.vehicles ?? "—"}</p>
                </div>
                <div className="glass-soft px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-2">Motorcycles</p>
                  <p className="mt-1 font-mono text-lg font-bold text-gold">{stats?.motorcycles ?? "—"}</p>
                </div>
                <div className="glass-soft px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-2">Pedestrians</p>
                  <p className="mt-1 font-mono text-lg font-bold text-text">{stats?.pedestrians ?? "—"}</p>
                </div>
                <div className="glass-soft px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-2">Avg speed</p>
                  <p className="mt-1 font-mono text-lg font-bold text-blue">
                    {stats ? `${Math.round(stats.avgSpeed)}` : "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-2">
                Condition: <span className="text-muted">{stats?.condition ?? "scanning"}</span> ·{" "}
                {cam.weather} · limit {cam.speedLimit} km/h
              </p>
            </div>
          </Panel>

          <Panel title="Active class mix" subtitle="From the current frame buffer">
            {mix.length === 0 ? (
              <p className="text-sm text-muted-2">
                No detections buffered yet — the pipeline samples one frame per second.
              </p>
            ) : (
              <DonutChart segments={mix} center={num(detections.length)} sub="BOXES" />
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title={`${cam.id} — ${cam.location}`}
            subtitle={`${cam.type} · ${cam.district} · ${cam.gps}`}
            actions={<StatusBadge status={cam.online ? "ONLINE" : "OFFLINE"} />}
            flush
          >
            <div className="p-4">
              <SimStage
                seed={cam.seed + 77}
                camId={cam.id}
                location={cam.location}
                district={cam.district}
                gps={cam.gps}
                hour={cam.hour}
                weather={cam.weather}
                density={cam.density}
                layout={cam.pedestrianZone ? "residential" : "road"}
                intersection={cam.intersection}
                pedestrianZone={cam.pedestrianZone}
                speedLimit={cam.speedLimit}
                ai
                aiLabels={labels}
                paused={paused}
                onStats={onStats}
                onDetection={onDetection}
                hud={[
                  { label: `${cam.id} · AI PIPELINE`, value: "" },
                  { label: cam.location.toUpperCase(), value: "" },
                ]}
              />
            </div>
          </Panel>

          <div className="console-grid c2">
            <Panel title="Throughput" subtitle="Detections per hour">
              <LineChart
                series={[{ label: "Detections", data: throughput, color: "var(--viz-1)" }]}
                labels={throughput.map((_, i) => `-${throughput.length - 1 - i}h`)}
                height={170}
              />
            </Panel>
            <Panel title="Precision" subtitle="Model confidence %">
              <LineChart
                series={[{ label: "Precision", data: precision, color: "var(--viz-3)" }]}
                labels={precision.map((_, i) => `-${precision.length - 1 - i}h`)}
                height={170}
              />
            </Panel>
          </div>
        </div>
      </div>

      <Panel title="Live detection buffer" subtitle={`${rows.length} tracked objects in the last frame`} flush>
        <div className="p-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search class or plate…" />
            <SegmentedControl
              value={aiFilter}
              onChange={setAiFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "vehicle", label: "Vehicle" },
                { value: "motorcycle", label: "Motorcycle" },
                { value: "pedestrian", label: "Pedestrian" },
              ]}
            />
            <span className="ml-auto text-xs text-muted-2">
              Detections are simulated and refreshed every second.
            </span>
          </Toolbar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(d) => d.key}
            maxHeight="420px"
            empty="No detections in the current buffer. Enable the AI overlay and wait for a frame."
          />
        </div>
      </Panel>
    </PageShell>
  );
}
