"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { BarMeter, DonutChart } from "@/components/ui/Charts";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, SegmentedControl, Select, Toolbar } from "@/components/ui/Controls";
import { DEVICES, DEVICE_TYPES, FLEET_KPI, type Device } from "@/lib/data";
import { ago, num } from "@/lib/util";

type Health = "all" | "healthy" | "degraded" | "fault";

export default function IotPage() {
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<Health>("all");
  const [type, setType] = useState("ALL");
  const [selected, setSelected] = useState<Device | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEVICES.filter(
      (d) =>
        (health === "all" ||
          (health === "healthy" ? d.health === "HEALTHY" : health === "degraded" ? d.health === "DEGRADED" : d.health === "FAULT")) &&
        (type === "ALL" || d.type === type) &&
        (!q || d.id.toLowerCase().includes(q) || d.location.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)),
    );
  }, [query, health, type]);

  const byType = useMemo(
    () =>
      DEVICE_TYPES.map((t) => {
        const list = DEVICES.filter((d) => d.type === t.key);
        return {
          key: t.key,
          label: t.label,
          total: list.length,
          online: list.filter((d) => d.online).length,
        };
      }),
    [],
  );

  const healthMix = useMemo(() => {
    const h = DEVICES.filter((d) => d.health === "HEALTHY").length;
    const g = DEVICES.filter((d) => d.health === "DEGRADED").length;
    const f = DEVICES.filter((d) => d.health === "FAULT").length;
    return [
      { label: "Healthy", value: h, color: "var(--viz-3)" },
      { label: "Degraded", value: g, color: "var(--viz-4)" },
      { label: "Fault", value: f, color: "var(--viz-5)" },
    ];
  }, []);

  const columns: Column<Device>[] = [
    { key: "id", header: "Device", render: (d) => <span className="font-mono text-xs text-gold">{d.id}</span> },
    { key: "label", header: "Type", render: (d) => <span className="text-text">{d.label}</span> },
    { key: "loc", header: "Location", render: (d) => d.location },
    { key: "district", header: "District", render: (d) => d.district },
    { key: "proto", header: "Protocol", render: (d) => <span className="font-mono text-xs">{d.proto}</span> },
    {
      key: "power",
      header: "Power",
      render: (d) =>
        d.battery === null ? (
          d.power
        ) : (
          <span className="flex items-center gap-2">
            <BarMeter value={d.battery} tone={d.battery < 30 ? "red" : "green"} />
            <span className="font-mono text-xs">{d.battery}%</span>
          </span>
        ),
    },
    { key: "uptime", header: "Uptime", render: (d) => <span className="font-mono">{d.uptime}%</span> },
    { key: "tx", header: "Tx/min", render: (d) => <span className="font-mono">{d.txRate}</span> },
    { key: "fw", header: "Firmware", render: (d) => <span className="font-mono text-xs">{d.firmware}</span> },
    { key: "health", header: "Health", render: (d) => <StatusBadge status={d.health} /> },
    { key: "ping", header: "Last ping", render: (d) => <span className="font-mono text-xs">{ago(d.lastPing)}</span> },
  ];

  return (
    <PageShell
      status={[
        { label: "Devices", value: num(DEVICES.length), tone: "green" },
        { label: "Faults", value: num(DEVICES.filter((d) => d.health === "FAULT").length), tone: "red" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Field network</span>
          <h1 className="page-title">IoT &amp; Device Health</h1>
          <p className="lead mt-4 max-w-3xl">
            {num(DEVICES.length)} connected field devices — cameras, radar, signals, GPS units, road
            sensors, edge AI nodes and weather stations — with uptime, battery and firmware telemetry.
          </p>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Connected", value: num(FLEET_KPI.devicesOnline), sub: `of ${num(FLEET_KPI.devices)}`, tone: "green" },
          { label: "Healthy", value: num(DEVICES.filter((d) => d.health === "HEALTHY").length), sub: "nominal", tone: "gold" },
          { label: "Degraded", value: num(DEVICES.filter((d) => d.health === "DEGRADED").length), sub: "monitor", tone: "gold" },
          { label: "Faults", value: num(DEVICES.filter((d) => d.health === "FAULT").length), sub: "dispatch technician", tone: "red" },
        ]}
      />

      <div className="console-grid c2 mb-6">
        <Panel title="Health distribution">
          <DonutChart segments={healthMix} center={num(DEVICES.length)} sub="DEVICES" />
        </Panel>
        <Panel title="Connectivity by device type" subtitle="Online vs total per class">
          <BarChartInline rows={byType} />
        </Panel>
      </div>

      <Panel title="Device registry" subtitle={`${num(rows.length)} devices`} flush>
        <div className="p-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search device, location or type…" />
            <SegmentedControl
              value={health}
              onChange={setHealth}
              options={[
                { value: "all", label: "All" },
                { value: "healthy", label: "Healthy" },
                { value: "degraded", label: "Degraded" },
                { value: "fault", label: "Fault" },
              ]}
            />
            <Select
              value={type}
              onChange={setType}
              label="Device type"
              options={[
                { value: "ALL", label: "All types" },
                ...DEVICE_TYPES.map((t) => ({ value: t.key, label: t.label })),
              ]}
            />
          </Toolbar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(d) => d.id}
            onRowClick={setSelected}
            maxHeight="620px"
            empty="No devices match the current filters."
          />
        </div>
      </Panel>

      {selected && (
        <Panel className="mt-6" title={`${selected.id} — ${selected.label}`}>
          <div className="grid gap-4 sm:grid-cols-3">
            <dl className="kv">
              <dt>Status</dt>
              <dd>
                <StatusBadge status={selected.health} />
              </dd>
              <dt>Location</dt>
              <dd>{selected.location}</dd>
              <dt>District</dt>
              <dd>{selected.district}</dd>
            </dl>
            <dl className="kv">
              <dt>Protocol</dt>
              <dd className="font-mono text-xs">{selected.proto}</dd>
              <dt>Firmware</dt>
              <dd className="font-mono text-xs">{selected.firmware}</dd>
              <dt>Language</dt>
              <dd className="text-xs">{selected.lang}</dd>
            </dl>
            <dl className="kv">
              <dt>Power</dt>
              <dd>{selected.battery === null ? selected.power : `${selected.battery}% battery`}</dd>
              <dt>Uptime</dt>
              <dd className="font-mono">{selected.uptime}%</dd>
              <dt>Last ping</dt>
              <dd className="font-mono text-xs">{ago(selected.lastPing)}</dd>
            </dl>
          </div>
        </Panel>
      )}
    </PageShell>
  );
}

function BarChartInline({ rows }: { rows: { key: string; label: string; total: number; online: number }[] }) {
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">{r.label}</span>
            <span className="font-mono text-text">
              {r.online}/{r.total}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill green" style={{ width: `${(r.online / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
