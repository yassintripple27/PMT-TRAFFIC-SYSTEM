"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { SearchInput, SegmentedControl, Toolbar } from "@/components/ui/Controls";
import {
  CAMERAS,
  DISTRICTS,
  FLEET_KPI,
  INCIDENTS,
  BORDER_PATH,
  LAKE_PATHS,
  MAP_VIEWBOX,
  project,
  series,
  type Camera,
  type Incident,
} from "@/lib/data";
import { ago, num } from "@/lib/util";

type Layer = "cameras" | "incidents" | "density";

export default function MapPage() {
  const [layer, setLayer] = useState<Layer>("cameras");
  const [district, setDistrict] = useState("ALL");
  const [selected, setSelected] = useState<Camera | Incident | null>(null);
  const [query, setQuery] = useState("");

  const incidents = useMemo(
    () => INCIDENTS.filter((i) => i.status !== "RESOLVED" && (district === "ALL" || i.district === district)),
    [district],
  );

  const cameras = useMemo(
    () =>
      CAMERAS.filter((c) => {
        if (district !== "ALL" && c.district !== district) return false;
        const q = query.trim().toLowerCase();
        return !q || c.id.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
      }),
    [district, query],
  );

  const congestion = useMemo(() => series(88, 24, 38, 22, 14), []);

  return (
    <PageShell
      status={[
        { label: "Open incidents", value: num(incidents.length), tone: "red" },
        { label: "Mapped cameras", value: num(cameras.length), tone: "green" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Geospatial</span>
          <h1 className="page-title">National Traffic Map</h1>
          <p className="lead mt-4 max-w-3xl">
            Every camera, incident and corridor on one map of Uganda. Select a marker for full
            diagnostics, or switch layers to isolate cameras, incidents or congestion.
          </p>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Cameras mapped", value: num(FLEET_KPI.total), sub: "GPS verified", tone: "gold" },
          { label: "Open incidents", value: num(incidents.length), sub: "right now", tone: "red" },
          { label: "Districts", value: num(FLEET_KPI.districts), sub: "with coverage", tone: "blue" },
          { label: "Peak congestion", value: `${congestion[18]}%`, sub: "18:00 index", tone: "gold" },
        ]}
      />

      <div className="console-grid sidebar">
        <div className="flex flex-col gap-6">
          <Panel title="Filters">
            <Toolbar className="mb-0">
              <SearchInput value={query} onChange={setQuery} placeholder="Search camera or road…" />
            </Toolbar>
            <div className="mt-4 flex flex-col gap-3">
              <SegmentedControl
                value={district}
                onChange={setDistrict}
                options={[
                  { value: "ALL", label: "All districts" },
                  { value: "Kampala", label: "Kampala" },
                  { value: "Wakiso", label: "Wakiso" },
                  { value: "Jinja", label: "Jinja" },
                  { value: "Mbarara", label: "Mbarara" },
                ]}
              />
              <SegmentedControl
                value={layer}
                onChange={setLayer}
                options={[
                  { value: "cameras", label: "Cameras" },
                  { value: "incidents", label: "Incidents" },
                  { value: "density", label: "Density" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Legend">
            <ul className="feat-list text-xs">
              <li className="feat-row">
                <i className="h-2.5 w-2.5 rounded-full bg-gold" /> Camera online
              </li>
              <li className="feat-row">
                <i className="h-2.5 w-2.5 rounded-full bg-muted-2" /> Camera offline
              </li>
              <li className="feat-row">
                <i className="h-2.5 w-2.5 rounded-full bg-red" /> Critical incident
              </li>
              <li className="feat-row">
                <i className="h-2.5 w-2.5 rounded-full bg-amber" /> Warning incident
              </li>
              <li className="feat-row">
                <i className="h-2.5 w-2.5 rounded-full bg-blue" /> Device / signal fault
              </li>
            </ul>
          </Panel>

          {selected && "typeLabel" in selected ? (
            <Panel title={selected.id} subtitle={selected.typeLabel}>
              <dl className="kv">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={selected.status} />
                </dd>
                <dt>Location</dt>
                <dd>{selected.location}</dd>
                <dt>District</dt>
                <dd>{selected.district}</dd>
                <dt>GPS</dt>
                <dd className="font-mono text-xs">{selected.gps}</dd>
                <dt>Detected</dt>
                <dd className="font-mono text-xs">{ago(selected.ts)}</dd>
                <dt>Unit</dt>
                <dd className="font-mono text-xs">{selected.assignedUnit ?? "unassigned"}</dd>
              </dl>
            </Panel>
          ) : selected ? (
            <Panel title={selected.id} subtitle={selected.type}>
              <dl className="kv">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={selected.online ? "ONLINE" : "OFFLINE"} />
                </dd>
                <dt>Location</dt>
                <dd>{selected.location}</dd>
                <dt>District</dt>
                <dd>{selected.district}</dd>
                <dt>GPS</dt>
                <dd className="font-mono text-xs">{selected.gps}</dd>
                <dt>Speed limit</dt>
                <dd className="font-mono">{selected.speedLimit} km/h</dd>
              </dl>
            </Panel>
          ) : (
            <Panel title="Selection">
              <p className="text-sm text-muted-2">
                Select a marker on the map to inspect the camera or incident.
              </p>
            </Panel>
          )}

          <Panel title="Quick links">
            <div className="flex flex-col gap-2">
              <Link href="/command-center" className="btn btn-ghost w-full">
                Command center
              </Link>
              <Link href="/cameras" className="btn btn-ghost w-full">
                Camera wall
              </Link>
              <Link href="/iot" className="btn btn-ghost w-full">
                IoT device health
              </Link>
            </div>
          </Panel>
        </div>

        <Panel title="Map" subtitle={`${MAP_VIEWBOX} projected view · ${num(cameras.length)} cameras plotted`}>
          <div className="relative aspect-[10/7] w-full overflow-hidden rounded-[14px] border border-stroke bg-bg-3">
            <svg viewBox={MAP_VIEWBOX} className="h-full w-full" role="img" aria-label="Uganda traffic map">
              <defs>
                <linearGradient id="map-land" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--bg-2)" />
                  <stop offset="100%" stopColor="var(--bg-3)" />
                </linearGradient>
              </defs>
              <rect width="1000" height="700" fill="url(#map-land)" />
              <path d={BORDER_PATH} fill="var(--panel-2)" stroke="rgba(201,148,32,0.55)" strokeWidth="2" />
              {LAKE_PATHS.map((l) => (
                <path key={l.name} d={l.d} fill="color-mix(in srgb, var(--viz-2) 16%, transparent)" stroke="color-mix(in srgb, var(--viz-2) 40%, transparent)" strokeWidth="1" />
              ))}

              {layer === "density" &&
                DISTRICTS.map((d) => {
                  const q = project(d.lon, d.lat);
                  return (
                    <circle key={d.city} cx={q.x} cy={q.y} r={18 + d.weight * 5} fill="color-mix(in srgb, var(--viz-1) 8%, transparent)" />
                  );
                })}

              {(layer === "cameras" || layer === "density") &&
                cameras.map((c) => {
                  const q = project(c.lon, c.lat);
                  return (
                    <circle
                      key={c.id}
                      cx={q.x}
                      cy={q.y}
                      r={layer === "density" ? 2.4 : 3.2}
                      fill={c.online ? "rgba(201,148,32,0.9)" : "var(--muted-2)"}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(c)}
                    />
                  );
                })}

              {(layer === "incidents" || layer === "cameras") &&
                incidents.map((i) => {
                  const q = project(i.lon, i.lat);
                  const color =
                    i.severity === "critical" ? "var(--viz-5)" : i.severity === "warning" ? "var(--viz-4)" : "var(--viz-2)";
                  return (
                    <g key={i.id} style={{ cursor: "pointer" }} onClick={() => setSelected(i)}>
                      <circle cx={q.x} cy={q.y} r="10" fill="none" stroke={color} strokeWidth="1.2" opacity="0.5">
                        <animate attributeName="r" values="5;14;5" dur="2.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={q.x} cy={q.y} r="4" fill={color} stroke="var(--bg-3)" strokeWidth="0.8" />
                    </g>
                  );
                })}

              {DISTRICTS.map((d) => {
                const q = project(d.lon, d.lat);
                const count = CAMERAS.filter((c) => c.district === d.city).length;
                return (
                  <g key={d.city}>
                    <text x={q.x + 10} y={q.y + 4} fill="var(--text)" fontSize="13" fontFamily="var(--mono)">
                      {d.city}
                    </text>
                    <text x={q.x + 10} y={q.y + 18} fill="var(--muted-2)" fontSize="10" fontFamily="var(--mono)">
                      {count} cams
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
