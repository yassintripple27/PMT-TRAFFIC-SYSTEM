"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { BarChart, DonutChart, LineChart } from "@/components/ui/Charts";
import { SegmentedControl, Select, Toolbar } from "@/components/ui/Controls";
import {
  CASES,
  DISTRICTS,
  FLEET_KPI,
  hourlyBoda,
  hourlyTraffic,
  series,
  violationsByLocation,
  violationsByType,
} from "@/lib/data";
import { num, ugx } from "@/lib/util";

type Range = "7D" | "30D" | "90D";

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30D");
  const [district, setDistrict] = useState("ALL");

  const n = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const seed = range === "7D" ? 3 : range === "30D" ? 31 : 97;

  const trend = useMemo(() => series(seed, n, 900, 260, 220), [seed, n]);
  const revenue = useMemo(() => series(seed + 5, n, 620, 240, 180), [seed, n]);
  const accuracy = useMemo(() => series(seed + 9, n, 92, 5, 3), [seed, n]);
  const traffic = useMemo(() => hourlyTraffic(seed), [seed]);
  const boda = useMemo(() => hourlyBoda(seed), [seed]);
  const byLocation = useMemo(() => violationsByLocation(seed), [seed]);
  const byType = useMemo(() => violationsByType(seed), [seed]);

  const scoped = useMemo(
    () => (district === "ALL" ? CASES : CASES.filter((c) => c.district === district)),
    [district],
  );
  const detected = scoped.length;
  const verified = scoped.filter((c) => c.verifiedBy !== null).length;
  const revenueTotal = scoped.filter((c) => c.status === "PAID").reduce((s, c) => s + c.penalty, 0);
  const rate = detected ? Math.round((verified / detected) * 100) : 0;

  const bySeverity = useMemo(
    () => [
      { label: "Critical", value: scoped.filter((c) => c.severity === "critical").length, color: "var(--viz-5)" },
      { label: "Warning", value: scoped.filter((c) => c.severity === "warning").length, color: "var(--viz-4)" },
    ],
    [scoped],
  );

  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  return (
    <PageShell
      status={[
        { label: "Range", value: range, tone: "blue" },
        { label: "Coverage", value: district === "ALL" ? "National" : district, tone: "gold" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Reporting</span>
          <h1 className="page-title">Traffic Analytics</h1>
          <p className="lead mt-4 max-w-3xl">
            Detection volume, verification rates, corridor load and revenue trends across the
            national fleet. All figures are derived from the simulated dataset.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Toolbar className="mb-0">
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: "7D", label: "7 days" },
              { value: "30D", label: "30 days" },
              { value: "90D", label: "90 days" },
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
          <span className="ml-auto text-xs text-muted-2">
            Window {range} · {n} days · {scoped.length} cases in scope
          </span>
        </Toolbar>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Detections", value: num(detected), sub: `over ${range}`, tone: "gold" },
          { label: "Verification rate", value: `${rate}%`, sub: `${verified} confirmed`, tone: "green" },
          { label: "Revenue collected", value: ugx(revenueTotal), sub: "paid cases", tone: "green" },
          { label: "Fleet uptime", value: `${Math.round((FLEET_KPI.online / FLEET_KPI.total) * 1000) / 10}%`, sub: `${FLEET_KPI.online}/${FLEET_KPI.total} cams`, tone: "blue" },
        ]}
      />

      <div className="console-grid c2 mb-6">
        <Panel title="Detection volume" subtitle={`Cases raised per day across ${range}`}>
          <LineChart
            series={[
              { label: "Detections", data: trend, color: "var(--viz-1)" },
              { label: "Verified", data: accuracy.map((a) => Math.round((trend[accuracy.indexOf(a)] ?? 0) * (a / 100))), color: "var(--viz-3)" },
            ]}
            labels={trend.map((_, i) => `D${i + 1}`)}
            height={230}
          />
        </Panel>
        <Panel title="Revenue collected" subtitle="Simulated UGX thousands per day">
          <LineChart
            series={[{ label: "Collected", data: revenue, color: "var(--viz-3)" }]}
            labels={revenue.map((_, i) => `D${i + 1}`)}
            height={230}
          />
        </Panel>
      </div>

      <div className="console-grid c2 mb-6">
        <Panel title="Corridor load by hour" subtitle="Cars vs motorcycles (boda-bodas)">
          <LineChart
            series={[
              { label: "Cars", data: traffic, color: "var(--viz-2)" },
              { label: "Motorcycles", data: boda, color: "var(--viz-1)" },
            ]}
            labels={hours}
            height={230}
          />
        </Panel>
        <Panel title="Violations by location" subtitle="Top reporting districts">
          <BarChart horizontal items={byLocation.slice(0, 8)} />
        </Panel>
      </div>

      <div className="console-grid c2">
        <Panel title="Violations by type">
          <BarChart items={byType} height={230} />
        </Panel>
        <Panel title="Severity split" subtitle="Critical vs warning cases in scope">
          <DonutChart segments={bySeverity} center={num(detected)} sub="CASES" />
        </Panel>
      </div>
    </PageShell>
  );
}
