"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import SimStage from "@/components/sim/SimStage";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState, KpiRow, Panel } from "@/components/ui/Panel";
import { Plate, SeverityDot, StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, SegmentedControl, Select, Toolbar } from "@/components/ui/Controls";
import { DonutChart, Sparkline } from "@/components/ui/Charts";
import {
  CAMERAS,
  DISTRICTS,
  FLEET_KPI,
  INCIDENTS,
  activeIncidents,
  hourlyTraffic,
  project,
  series,
  type Incident,
} from "@/lib/data";
import { ago, num } from "@/lib/util";
import { useToasts } from "@/components/ui/Modal";

type Feed = "incidents" | "cameras";
type Window_ = "1H" | "6H" | "24H";

export default function CommandCenterPage() {
  const [district, setDistrict] = useState("ALL");
  const [feed, setFeed] = useState<Feed>("incidents");
  const [win, setWin] = useState<Window_>("6H");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const { items, push, dismiss } = useToasts();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INCIDENTS.filter(
      (i) =>
        (district === "ALL" || i.district === district) &&
        (!q ||
          i.id.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.typeLabel.toLowerCase().includes(q)),
    ).slice(0, 40);
  }, [district, query]);

  const onStats = useCallback(() => {}, []);

  const hourly = useMemo(() => hourlyTraffic(11), []);
  const detectionSeries = useMemo(() => series(31, 14, 420, 130, 60), []);

  const severityMix = useMemo(() => {
    const c = INCIDENTS.filter((i) => i.severity === "critical").length;
    const w = INCIDENTS.filter((i) => i.severity === "warning").length;
    const n = INCIDENTS.filter((i) => i.severity === "info").length;
    return [
      { label: "Critical", value: c, color: "var(--viz-5)" },
      { label: "Warning", value: w, color: "var(--viz-4)" },
      { label: "Info", value: n, color: "var(--viz-2)" },
    ];
  }, []);

  const columns: Column<Incident>[] = [
    {
      key: "id",
      header: "Incident",
      render: (i) => (
        <span className="font-mono text-xs text-text">
          <SeverityDot severity={i.severity} />
          <span className="ml-2">{i.id}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", render: (i) => <span className="text-text">{i.typeLabel}</span> },
    { key: "loc", header: "Location", render: (i) => i.location },
    { key: "dist", header: "District", render: (i) => i.district },
    {
      key: "plate",
      header: "Plate",
      render: (i) => (i.plate ? <Plate>{i.plate}</Plate> : <span className="text-muted-2">—</span>),
    },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "ts", header: "Detected", render: (i) => <span className="font-mono">{ago(i.ts)}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Fleet", value: `${FLEET_KPI.online}/${FLEET_KPI.total}`, tone: "green" },
        { label: "Open incidents", value: num(activeIncidents().length), tone: "red" },
        { label: "Feed", value: live ? "LIVE" : "PAUSED", tone: live ? "gold" : "blue" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">National operations</span>
          <h1 className="page-title">Traffic Command Center</h1>
          <p className="lead mt-4 max-w-3xl">
            One screen for the {FLEET_KPI.total} camera fleet across {FLEET_KPI.districts} districts:
            live corridor feeds, AI detections, incident dispatch and enforcement queues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={win}
            onChange={setWin}
            options={[
              { value: "1H", label: "1H" },
              { value: "6H", label: "6H" },
              { value: "24H", label: "24H" },
            ]}
          />
          <button
            type="button"
            className={live ? "btn btn-ghost" : "btn"}
            onClick={() => {
              setLive((v) => !v);
              push(live ? "Live feeds paused" : "Live feeds resumed", live ? "blue" : "green");
            }}
          >
            {live ? "Pause feeds" : "Resume feeds"}
          </button>
          <Link href="/ai-detection" className="btn">
            Open AI detection
          </Link>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Cameras online", value: `${FLEET_KPI.online}`, sub: `${FLEET_KPI.offline} offline`, tone: "green" },
          { label: "Detections / h", value: num(detectionSeries[detectionSeries.length - 1]), sub: "AI pipeline", tone: "gold" },
          { label: "Open incidents", value: num(activeIncidents().length), sub: "awaiting response", tone: "red" },
          { label: "Corridors monitored", value: num(hourly[18]), sub: "vehicles @ 18:00", tone: "blue" },
        ]}
      />

      <div className="console-grid sidebar mb-6">
        <div className="flex flex-col gap-6">
          <Panel
            title="National live map"
            subtitle="Camera status, active incidents and district load"
            actions={
              <SegmentedControl
                value={district}
                onChange={setDistrict}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "Kampala", label: "Kampala" },
                  { value: "Jinja", label: "Jinja" },
                ]}
              />
            }
          >
            <NationalMap district={district} onSelect={setDistrict} />
          </Panel>

          <Panel title="Incident severity mix">
            <DonutChart segments={severityMix} center={num(INCIDENTS.length)} sub="LAST 24H" />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title="Corridor live feed"
            subtitle="Kampala Road — simulated perspective feed with AI overlay"
            actions={
              <Link href="/cameras" className="text-xs text-gold hover:underline">
                Open camera wall
              </Link>
            }
            flush
          >
            <div className="p-4">
              <SimStage
                seed={4242}
                location="Kampala Road — North"
                district="Kampala"
                hour={8.2}
                density={0.7}
                weather="clear"
                ai
                aiLabels
                speedLimit={60}
                paused={!live}
                onStats={onStats}
                hud={[
                  { label: "CAM-001 · ANPR + PTZ", value: "" },
                  { label: "08:12:44 · KAMPALA ROAD", value: "" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Detections in the last 14 hours" subtitle="AI pipeline throughput">
            <Sparkline data={detectionSeries} />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {detectionSeries.slice(-4).map((v, i) => (
                <div key={i} className="glass-soft px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-2">
                    T−{3 - i}h
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-gold">{num(v)}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title={feed === "incidents" ? "Incident queue" : "Camera fleet status"}
        subtitle={`${filtered.length} records · window ${win}`}
        actions={
          <SegmentedControl
            value={feed}
            onChange={setFeed}
            options={[
              { value: "incidents", label: "Incidents" },
              { value: "cameras", label: "Cameras" },
            ]}
          />
        }
        flush
      >
        <div className="p-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search incident, location or type…" />
            <Select
              value={district}
              onChange={setDistrict}
              label="District"
              options={[
                { value: "ALL", label: "All districts" },
                ...DISTRICTS.map((d) => ({ value: d.city, label: d.city })),
              ]}
            />
          </Toolbar>
          {feed === "incidents" ? (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(i) => i.id}
              empty="No incidents match the current filters."
            />
          ) : (
            <EmptyState
              title="Camera fleet table"
              hint="Full camera inventory with per-device diagnostics lives on the Cameras page."
            />
          )}
        </div>
      </Panel>
    </PageShell>
  );
}

function NationalMap({
  district,
  onSelect,
}: {
  district: string;
  onSelect: (value: string) => void;
}) {
  const pulses = INCIDENTS.filter((i) => i.status !== "RESOLVED").slice(0, 12);
  return (
    <div className="relative aspect-[10/7] w-full overflow-hidden rounded-[14px] border border-stroke bg-bg-3">
      <svg viewBox="0 0 1000 700" className="h-full w-full" role="img" aria-label="National camera map">
        <defs>
          <linearGradient id="cc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bg-2)" />
            <stop offset="100%" stopColor="var(--bg-3)" />
          </linearGradient>
          <radialGradient id="cc-glow" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="700" fill="url(#cc-sea)" />
        <rect width="1000" height="700" fill="url(#cc-glow)" />
        <UgaOutline />
        <Lakes />
        <DistrictNodes onSelect={onSelect} active={district} />
        {pulses.map((p, i) => {
          const q = project(p.lon, p.lat);
          return (
            <g key={p.id}>
              <circle
                cx={q.x}
                cy={q.y}
                r="9"
                fill="none"
                stroke={p.severity === "critical" ? "var(--viz-5)" : "var(--viz-4)"}
                strokeWidth="1.4"
                opacity="0.5"
              >
                <animate attributeName="r" values="6;15;6" dur={`${2.4 + (i % 4) * 0.4}s`} repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0.65;0;0.65"
                  dur={`${2.4 + (i % 4) * 0.4}s`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={q.x}
                cy={q.y}
                r="3.4"
                fill={p.severity === "critical" ? "var(--viz-5)" : "var(--viz-4)"}
              />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
        {CAMERAS.slice(0, 120).map((c) => {
          const q = project(c.lon, c.lat);
          return (
            <span
              key={c.id}
              className={c.online ? "bg-gold/70" : "bg-muted-2/50"}
              style={{
                position: "absolute",
                left: `${(q.x / 1000) * 100}%`,
                top: `${(q.y / 700) * 100}%`,
                width: 3,
                height: 3,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1.5 text-[0.6rem] font-mono text-muted-2">
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-gold" /> camera online
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-muted-2" /> offline
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-red" /> open incident
        </span>
      </div>
    </div>
  );
}

function UgaOutline() {
  return (
    <path
      d="M470 205 L560 190 L640 200 L700 178 L790 200 L860 180 L930 250 L950 320 L920 400 L880 450 L845 520 L760 500 L700 540 L620 520 L560 555 L480 530 L430 500 L390 440 L360 380 L350 300 L395 240 Z"
      fill="var(--panel-2)"
      stroke="rgba(201,148,32,0.5)"
      strokeWidth="1.6"
    />
  );
}

function Lakes() {
  return (
    <g fill="color-mix(in srgb, var(--viz-2) 16%, transparent)" stroke="color-mix(in srgb, var(--viz-2) 40%, transparent)" strokeWidth="1">
      <path d="M690 430 L820 420 L860 470 L800 500 L700 480 Z" />
      <path d="M420 380 L450 370 L460 420 L430 430 Z" />
      <path d="M500 360 L600 350 L640 380 L560 400 Z" />
    </g>
  );
}

function DistrictNodes({
  onSelect,
  active,
}: {
  onSelect: (value: string) => void;
  active: string;
}) {
  return (
    <g>
      {DISTRICTS.map((d) => {
        const q = project(d.lon, d.lat);
        const on = active === d.city;
        const count = CAMERAS.filter((c) => c.district === d.city).length;
        return (
          <g
            key={d.city}
            onClick={() => onSelect(on ? "ALL" : d.city)}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(on ? "ALL" : d.city);
            }}
          >
            <circle cx={q.x} cy={q.y} r={on ? 12 : 9} fill="rgba(201,148,32,0.18)" />
            <circle
              cx={q.x}
              cy={q.y}
              r="3.6"
              fill={on ? "var(--gold)" : "var(--muted)"}
              stroke={on ? "var(--bg-3)" : "none"}
              strokeWidth="1"
            />
            <text
              x={q.x + 11}
              y={q.y + 4}
              fill={on ? "var(--gold-2)" : "var(--muted)"}
              fontSize="12"
              fontFamily="var(--mono)"
            >
              {d.city}
            </text>
            <text x={q.x + 11} y={q.y + 17} fill="var(--muted-2)" fontSize="10" fontFamily="var(--mono)">
              {count} cams
            </text>
          </g>
        );
      })}
    </g>
  );
}
