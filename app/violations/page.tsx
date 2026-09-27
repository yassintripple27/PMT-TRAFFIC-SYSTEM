"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { Plate, SeverityDot, StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, Select, Toolbar, Tabs } from "@/components/ui/Controls";
import { BarChart, LineChart } from "@/components/ui/Charts";
import { Modal, useToasts } from "@/components/ui/Modal";
import {
  CASES,
  CASES as ALL_CASES,
  DEFAULT_RULES,
  DISTRICTS,
  series,
  vehicleByPlate,
  violationsByType,
  type CaseStatus,
  type TrafficCase,
} from "@/lib/data";
import { ago, dateTime, num, ugx } from "@/lib/util";
import { useAudit, useRules, useSession } from "@/lib/store";

type Tab = "queue" | "verified" | "rules";

const STATUSES: (CaseStatus | "ALL")[] = [
  "ALL",
  "PENDING VERIFICATION",
  "UNPAID",
  "PAID",
  "RESOLVED",
  "PAYMENT PENDING",
];

export default function ViolationsPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CaseStatus | "ALL">("ALL");
  const [district, setDistrict] = useState("ALL");
  const [selected, setSelected] = useState<TrafficCase | null>(null);
  const { rules, update } = useRules();
  const { log, record } = useAudit();
  const { session, can } = useSession();
  const { items, push, dismiss } = useToasts();
  const locked = (perm: string) => Boolean(session) && !can(perm);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CASES.filter((c) => {
      if (tab === "queue" && c.status !== "PENDING VERIFICATION") return false;
      if (tab === "verified" && c.status === "PENDING VERIFICATION") return false;
      if (status !== "ALL" && c.status !== status) return false;
      if (district !== "ALL" && c.district !== district) return false;
      if (
        q &&
        ![
          c.id,
          c.plate,
          c.location,
          c.violationLabel,
          c.vehicleType,
          c.make,
          c.model,
        ].some((f) => f.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [tab, query, status, district]);

  const pending = CASES.filter((c) => c.status === "PENDING VERIFICATION").length;
  const unpaid = CASES.filter((c) => c.status === "UNPAID").length;
  const collected = CASES.filter((c) => c.status === "PAID").reduce((s, c) => s + c.penalty, 0);
  const trend = useMemo(() => series(7, 30, 38, 14, 8), []);

  const verify = (c: TrafficCase, accept: boolean) => {
    record(
      accept ? "VIOLATION_VERIFIED" : "VIOLATION_REJECTED",
      { case: c.id, plate: c.plate, rule: c.violation },
      session,
    );
    push(
      accept
        ? `${c.id} verified — notice issued to ${c.plate}`
        : `${c.id} rejected and returned to the AI pool`,
      accept ? "green" : "red",
    );
    setSelected(null);
  };

  const columns: Column<TrafficCase>[] = [
    {
      key: "id",
      header: "Case",
      render: (c) => (
        <span className="font-mono text-xs text-text">
          <SeverityDot severity={c.severity} />
          <span className="ml-2">{c.id}</span>
        </span>
      ),
    },
    { key: "plate", header: "Plate", render: (c) => <Plate>{c.plate}</Plate> },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (c) => (
        <span>
          {c.make} {c.model}
          <span className="ml-2 text-[0.65rem] text-muted-2">{c.vehicleType}</span>
        </span>
      ),
    },
    { key: "violation", header: "Violation", render: (c) => <span className="text-text">{c.violationLabel}</span> },
    { key: "loc", header: "Location", render: (c) => `${c.location}` },
    { key: "district", header: "District", render: (c) => c.district },
    {
      key: "speed",
      header: "Speed",
      render: (c) => (
        <span className="font-mono">
          {c.speed} / {c.speedLimit} km/h
        </span>
      ),
    },
    {
      key: "conf",
      header: "Confidence",
      render: (c) => <span className="font-mono text-gold">{Math.round(c.confidence * 100)}%</span>,
    },
    { key: "penalty", header: "Penalty", align: "right", render: (c) => <span className="font-mono">{ugx(c.penalty)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "ts", header: "Detected", render: (c) => <span className="font-mono text-xs">{dateTime(new Date(c.ts))}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Awaiting review", value: num(pending), tone: "gold" },
        { label: "Unpaid", value: num(unpaid), tone: "red" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Enforcement</span>
          <h1 className="page-title">Violations &amp; Detection Rules</h1>
          <p className="lead mt-4 max-w-3xl">
            {num(ALL_CASES.length)} AI-raised cases with human verification before any notice is
            issued. Rules below {DEFAULT_RULES.filter((r) => !r.enabled).length} detections are held
            below the enforcement threshold.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/fines" className="btn">
            Open fines &amp; payments
          </Link>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Cases recorded", value: num(ALL_CASES.length), sub: "last 30 days", tone: "gold" },
          { label: "Awaiting verification", value: num(pending), sub: "human review", tone: "gold" },
          { label: "Unpaid", value: num(unpaid), sub: "notices issued", tone: "red" },
          { label: "Value collected", value: ugx(collected), sub: "paid cases", tone: "green" },
        ]}
      />

      <div className="console-grid c2 mb-6">
        <Panel title="Cases raised per day" subtitle="Rolling 30-day detection volume">
          <LineChart
            series={[{ label: "Cases raised", data: trend, color: "var(--viz-1)" }]}
            labels={trend.map((_, i) => `D${i + 1}`)}
            height={200}
          />
        </Panel>
        <Panel title="Violations by type" subtitle="Distribution across enabled rules">
          <BarChart items={violationsByType(19).slice(0, 6)} height={200} />
        </Panel>
      </div>

      <Panel flush>
        <div className="p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "queue", label: "Verification queue", badge: pending },
              { value: "verified", label: "All cases", badge: ALL_CASES.length },
              { value: "rules", label: "Detection rules", badge: rules.filter((r) => r.enabled).length },
            ]}
          />

          {tab === "rules" ? (
            <div className="grid-cards">
              {rules.map((r) => (
                <div key={r.key} className="grid-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{r.label}</p>
                      <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-2">
                        {r.key}
                      </p>
                    </div>
                    <SeverityDot severity={r.severity} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-2">{r.note}</p>
                  <dl className="kv mt-4">
                    <dt>Penalty</dt>
                    <dd className="font-mono">{ugx(r.penalty)}</dd>
                    <dt>Min. confidence</dt>
                    <dd className="font-mono">{Math.round(r.confidence * 100)}%</dd>
                  </dl>
                  <button
                    type="button"
                    className={r.enabled ? "btn btn-ghost mt-4 w-full" : "btn mt-4 w-full"}
                    disabled={locked("rules")}
                    onClick={() => {
                      update(r.key, { enabled: !r.enabled });
                      record("RULE_TOGGLED", { rule: r.key, enabled: !r.enabled }, session);
                      push(
                        `${r.label} ${r.enabled ? "disabled" : "enabled"}`,
                        r.enabled ? "blue" : "green",
                      );
                    }}
                  >
                    {r.enabled ? "Disable rule" : "Enable rule"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Toolbar>
                <SearchInput value={query} onChange={setQuery} placeholder="Search case, plate, location…" />
                <Select
                  value={status}
                  onChange={setStatus}
                  label="Status"
                  options={STATUSES.map((s) => ({ value: s, label: s === "ALL" ? "All statuses" : s }))}
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
                  {num(rows.length)} matching · select a row to verify
                </span>
              </Toolbar>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(c) => c.id}
                onRowClick={setSelected}
                empty="No cases match the current filters."
              />
            </>
          )}
        </div>
      </Panel>

      {tab !== "rules" && (
        <Panel className="mt-6" title="Recent rule changes" subtitle={`${log.length} audit entries`}>
          {log.length === 0 ? (
            <p className="text-sm text-muted-2">
              No rule or verification activity recorded in this browser session yet.
            </p>
          ) : (
            <ul className="feat-list">
              {log.slice(0, 6).map((e) => (
                <li key={e.id} className="feat-row">
                  <span className="font-mono text-[0.68rem] text-gold">{e.action}</span>
                  <span className="flex-1 text-xs text-muted">{JSON.stringify(e.detail)}</span>
                  <span className="text-[0.65rem] text-muted-2">{e.actor}</span>
                  <span className="font-mono text-[0.65rem] text-muted-2">{ago(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <CaseReview
        record={selected}
        onClose={() => setSelected(null)}
        onVerify={verify}
        canVerify={!locked("verify")}
      />
    </PageShell>
  );
}

function CaseReview({
  record: c,
  onClose,
  onVerify,
  canVerify,
}: {
  record: TrafficCase | null;
  onClose: () => void;
  onVerify: (c: TrafficCase, accept: boolean) => void;
  canVerify: boolean;
}) {
  const vehicle = c ? vehicleByPlate(c.plate) : null;
  return (
    <Modal
      open={c !== null}
      onClose={onClose}
      title={c ? `${c.id} — ${c.violationLabel}` : ""}
      subtitle={c ? `${c.plate} · ${c.date} ${c.time}` : undefined}
      wide
      footer={
        c &&
        c.status === "PENDING VERIFICATION" && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => onVerify(c, false)}>
              Reject case
            </button>
            <button type="button" className="btn" onClick={() => onVerify(c, true)}>
              Verify &amp; issue notice
            </button>
          </>
        )
      }
    >
      {c && (
        <>
          {!canVerify && (
            <p className="rounded-[14px] border border-[var(--viz-2)]/30 bg-[var(--viz-2)]/10 px-4 py-3 text-xs text-blue">
              Your role cannot verify cases. The buttons below are disabled until a traffic admin or
              commander session is active.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-soft p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">
                Detection evidence
              </p>
              <p className="mt-3 text-sm text-text">{c.evidenceFrames} frames retained</p>
              <p className="mt-1 text-xs text-muted">
                Confidence {Math.round(c.confidence * 100)}% · seed #{c.seed}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={c.status} />
                <SeverityDot severity={c.severity} />
                <span className="text-xs text-muted-2">{c.violationLabel}</span>
              </div>
            </div>
            <div className="glass-soft p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">
                Registered vehicle
              </p>
              <dl className="kv mt-3">
                <dt>Plate</dt>
                <dd>
                  <Plate>{c.plate}</Plate>
                </dd>
                <dt>Make</dt>
                <dd>{vehicle ? `${vehicle.make} ${vehicle.model}` : `${c.make} ${c.model}`}</dd>
                <dt>Class</dt>
                <dd>{c.vehicleType}</dd>
                <dt>Insurance</dt>
                <dd>{vehicle ? vehicle.insurance : "not on file"}</dd>
              </dl>
            </div>
          </div>
          <dl className="kv">
            <dt>Camera</dt>
            <dd className="font-mono">{c.camId}</dd>
            <dt>Location</dt>
            <dd>{c.location}</dd>
            <dt>District</dt>
            <dd>{c.district}</dd>
            <dt>GPS</dt>
            <dd className="font-mono text-xs">{c.gps}</dd>
            <dt>Speed recorded</dt>
            <dd className="font-mono">
              {c.speed} km/h (limit {c.speedLimit} km/h)
            </dd>
            <dt>Penalty</dt>
            <dd className="font-mono">{ugx(c.penalty)}</dd>
            <dt>Verified by</dt>
            <dd>{c.verifiedBy ?? "awaiting verification"}</dd>
          </dl>
        </>
      )}
    </Modal>
  );
}
