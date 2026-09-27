"use client";

import { useMemo, useState } from "react";
import SimStage from "@/components/sim/SimStage";
import { CameraDetail } from "@/components/cameras/CameraDetail";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { SearchInput, SegmentedControl, Select, Toolbar } from "@/components/ui/Controls";
import { CAMERAS, DISTRICTS, FLEET_KPI, searchCameras, type Camera } from "@/lib/data";
import { ago, num } from "@/lib/util";

type Status = "all" | "online" | "offline";
type Sort = "id" | "district" | "type";

export default function CamerasPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [district, setDistrict] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [sort, setSort] = useState<Sort>("id");
  const [selected, setSelected] = useState<Camera | null>(null);

  const types = useMemo(() => Array.from(new Set(CAMERAS.map((c) => c.type))).sort(), []);

  const rows = useMemo(() => {
    return searchCameras(query)
      .filter(
        (c) =>
          (status === "all" || (status === "online" ? c.online : !c.online)) &&
          (district === "ALL" || c.district === district) &&
          (type === "ALL" || c.type === type),
      )
      .sort((a, b) => {
        if (sort === "district") return a.district.localeCompare(b.district) || a.id.localeCompare(b.id);
        if (sort === "type") return a.type.localeCompare(b.type) || a.id.localeCompare(b.id);
        return a.id.localeCompare(b.id);
      });
  }, [query, status, district, type, sort]);

  const wall = useMemo(() => CAMERAS.filter((c) => c.online).slice(0, 8), []);

  return (
    <PageShell
      status={[
        { label: "Online", value: num(FLEET_KPI.online), tone: "green" },
        { label: "Offline", value: num(FLEET_KPI.offline), tone: "red" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Camera network</span>
          <h1 className="page-title">Camera Fleet &amp; Live Wall</h1>
          <p className="lead mt-4 max-w-3xl">
            {FLEET_KPI.total} smart traffic cameras across {FLEET_KPI.districts} districts with
            ANPR, PTZ, speed and pedestrian-zone coverage. Open any feed for a full simulated view.
          </p>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Total deployed", value: num(FLEET_KPI.total), sub: "nationwide", tone: "gold" },
          { label: "Online", value: num(FLEET_KPI.online), sub: "streaming now", tone: "green" },
          { label: "Offline", value: num(FLEET_KPI.offline), sub: "needs attention", tone: "red" },
          { label: "Districts", value: num(FLEET_KPI.districts), sub: "covered", tone: "blue" },
        ]}
      />

      <Panel
        title="Live wall"
        subtitle="Eight concurrent simulated feeds — select a tile to open it"
        className="mb-6"
      >
        <div className="cam-grid">
          {wall.map((c) => (
            <button key={c.id} type="button" className="text-left" onClick={() => setSelected(c)}>
              <SimStage
                seed={c.seed}
                camId={c.id}
                location={c.location}
                district={c.district}
                gps={c.gps}
                hour={c.hour}
                weather={c.weather}
                density={c.density}
                layout={c.pedestrianZone ? "residential" : "road"}
                intersection={c.intersection}
                pedestrianZone={c.pedestrianZone}
                speedLimit={c.speedLimit}
                quality="low"
                hud={[
                  { label: c.id, value: "" },
                  { label: c.location.toUpperCase(), value: "" },
                ]}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="truncate text-xs text-muted">{c.location}</span>
                <StatusBadge status="ONLINE" />
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Fleet inventory" subtitle={`${num(rows.length)} of ${FLEET_KPI.total} cameras`} flush>
        <div className="p-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search ID, road, district, type…" />
            <SegmentedControl
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: `All ${FLEET_KPI.total}` },
                { value: "online", label: `Online ${FLEET_KPI.online}` },
                { value: "offline", label: `Offline ${FLEET_KPI.offline}` },
              ]}
            />
            <Select
              value={district}
              onChange={setDistrict}
              label="District"
              options={[
                { value: "ALL", label: "All districts" },
                ...DISTRICTS.map((d) => ({ value: d.city, label: d.city })),
              ]}
            />
            <Select
              value={type}
              onChange={setType}
              label="Camera type"
              options={[{ value: "ALL", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]}
            />
            <Select
              value={sort}
              onChange={setSort}
              label="Sort"
              options={[
                { value: "id", label: "Sort: ID" },
                { value: "district", label: "Sort: District" },
                { value: "type", label: "Sort: Type" },
              ]}
            />
          </Toolbar>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.slice(0, 60).map((c) => (
              <button key={c.id} type="button" className="grid-card text-left" onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-gold">{c.id}</p>
                    <p className="mt-1 truncate text-sm text-text">{c.location}</p>
                  </div>
                  <StatusBadge status={c.online ? "ONLINE" : "OFFLINE"} />
                </div>
                <dl className="kv mt-4">
                  <dt>District</dt>
                  <dd>{c.district}</dd>
                  <dt>Type</dt>
                  <dd>{c.type}</dd>
                  <dt>GPS</dt>
                  <dd className="font-mono text-xs">{c.gps}</dd>
                  <dt>Limit</dt>
                  <dd className="font-mono">{c.speedLimit} km/h</dd>
                  <dt>Last ping</dt>
                  <dd className="font-mono text-xs">{ago(c.lastPing)}</dd>
                </dl>
              </button>
            ))}
          </div>

          {rows.length > 60 && (
            <p className="mt-5 text-center text-xs text-muted-2">
              Showing the first 60 of {num(rows.length)} matching cameras — refine the filters to
              narrow the list.
            </p>
          )}
        </div>
      </Panel>

      <CameraDetail camera={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}
