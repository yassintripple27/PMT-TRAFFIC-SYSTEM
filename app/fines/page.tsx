"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { Plate, StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, SegmentedControl, Toolbar, Tabs } from "@/components/ui/Controls";
import { BarChart, DonutChart, LineChart } from "@/components/ui/Charts";
import { Modal, useToasts } from "@/components/ui/Modal";
import { CASES, series, vehicleByPlate, type TrafficCase } from "@/lib/data";
import { dateTime, num, ugx, uid } from "@/lib/util";
import { useAudit, usePayments, useSession } from "@/lib/store";

type Tab = "outstanding" | "pending" | "paid";
type Method = "Mobile Money" | "Bank Transfer" | "Cash";

const METHODS: Method[] = ["Mobile Money", "Bank Transfer", "Cash"];

export default function FinesPage() {
  const [tab, setTab] = useState<Tab>("outstanding");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TrafficCase | null>(null);
  const [method, setMethod] = useState<Method>("Mobile Money");
  const { payments, setPayments } = usePayments();
  const { record } = useAudit();
  const { session, can } = useSession();
  const { items, push, dismiss } = useToasts();

  const outstanding = CASES.filter((c) => c.status === "UNPAID");
  const pending = CASES.filter((c) => c.status === "PENDING VERIFICATION");
  const paid = CASES.filter((c) => c.status === "PAID");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = tab === "outstanding" ? outstanding : tab === "pending" ? pending : paid;
    return base.filter(
      (c) => !q || [c.id, c.plate, c.violationLabel, c.location].some((f) => f.toLowerCase().includes(q)),
    );
  }, [tab, query, outstanding, pending, paid]);

  const collected = paid.reduce((s, c) => s + c.penalty, 0);
  const owed = outstanding.reduce((s, c) => s + c.penalty, 0);
  const trend = useMemo(() => series(23, 14, 52, 18, 12), []);

  const canPay = can("payments") || !session;

  const pay = (c: TrafficCase) => {
    const reference = `MPESA-${uid("RF").slice(3)}`;
    setPayments((prev) => ({
      ...prev,
      [c.id]: {
        status: "PENDING APPROVAL",
        method,
        reference,
        amount: c.penalty,
        ts: Date.now(),
        officer: session?.user.officerId ?? "OF-00000",
      },
    }));
    record(
      "FINE_PAYMENT_SUBMITTED",
      { case: c.id, plate: c.plate, amount: c.penalty, method, reference },
      session,
    );
    push(`${c.id} payment submitted via ${method} — awaiting approval`, "gold");
    setSelected(null);
  };

  const columns: Column<TrafficCase>[] = [
    { key: "id", header: "Case", render: (c) => <span className="font-mono text-xs text-text">{c.id}</span> },
    { key: "plate", header: "Plate", render: (c) => <Plate>{c.plate}</Plate> },
    { key: "violation", header: "Violation", render: (c) => <span className="text-text">{c.violationLabel}</span> },
    { key: "location", header: "Location", render: (c) => c.location },
    { key: "owner", header: "Owner", render: (c) => vehicleByPlate(c.plate)?.owner ?? "restricted" },
    { key: "amount", header: "Amount", align: "right", render: (c) => <span className="font-mono text-gold">{ugx(c.penalty)}</span> },
    {
      key: "payment",
      header: "Payment",
      render: (c) =>
        payments[c.id] ? <StatusBadge status={payments[c.id].status} /> : <StatusBadge status={c.status} />,
    },
    { key: "ts", header: "Issued", render: (c) => <span className="font-mono text-xs">{dateTime(new Date(c.ts))}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Outstanding", value: ugx(owed), tone: "red" },
        { label: "Collected", value: ugx(collected), tone: "green" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Revenue</span>
          <h1 className="page-title">Fines, Payments &amp; Receipts</h1>
          <p className="lead mt-4 max-w-3xl">
            Enforcement notices awaiting settlement, payment submissions under review and the
            collected total. All amounts are simulated UGX for demonstration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/violations" className="btn btn-ghost">
            Back to violations
          </Link>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Outstanding", value: ugx(owed), sub: `${num(outstanding.length)} notices`, tone: "red" },
          { label: "Collected", value: ugx(collected), sub: `${num(paid.length)} receipts`, tone: "green" },
          { label: "Pending verification", value: num(pending.length), sub: "not yet issued", tone: "gold" },
          { label: "Avg. penalty", value: ugx(Math.round((owed + collected) / Math.max(1, outstanding.length + paid.length))), sub: "per case", tone: "blue" },
        ]}
      />

      <div className="console-grid c2 mb-6">
        <Panel title="Collections trend" subtitle="Simulated daily revenue, last 14 days">
          <LineChart
            series={[{ label: "Collected (UGX '000)", data: trend, color: "var(--viz-3)" }]}
            labels={trend.map((_, i) => `D${i + 1}`)}
            height={200}
          />
        </Panel>
        <Panel title="Outstanding by violation type">
          <BarChart
            horizontal
            items={Object.entries(
              outstanding.reduce<Record<string, number>>((acc, c) => {
                acc[c.violationLabel] = (acc[c.violationLabel] ?? 0) + c.penalty / 1000;
                return acc;
              }, {}),
            )
              .map(([label, value]) => ({ label, value: Math.round(value) }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)}
          />
        </Panel>
      </div>

      <Panel flush>
        <div className="p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "outstanding", label: "Outstanding", badge: outstanding.length },
              { value: "pending", label: "Pending verification", badge: pending.length },
              { value: "paid", label: "Paid & receipts", badge: paid.length },
            ]}
          />
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search case, plate or violation…" />
            <span className="ml-auto text-xs text-muted-2">
              {num(rows.length)} records · select a row to act
            </span>
          </Toolbar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.id}
            onRowClick={setSelected}
            empty="No records in this queue."
          />
        </div>
      </Panel>

      <Panel className="mt-6" title="Payment ledger" subtitle={`${Object.keys(payments).length} submissions this session`}>
        {Object.keys(payments).length === 0 ? (
          <p className="text-sm text-muted-2">
            No payments submitted yet in this browser session. Submissions are stored locally and
            never leave the device.
          </p>
        ) : (
          <DonutChart
            segments={Object.values(payments).reduce<{ label: string; value: number; color: string }[]>(
              (acc, p) => {
                const found = acc.find((a) => a.label === p.method);
                if (found) found.value += p.amount;
                else
                  acc.push({
                    label: p.method,
                    value: p.amount,
                    color: p.method === "Mobile Money" ? "var(--viz-1)" : p.method === "Bank Transfer" ? "var(--viz-2)" : "var(--viz-3)",
                  });
                return acc;
              },
              [],
            )}
            center={ugx(Object.values(payments).reduce((s, p) => s + p.amount, 0))}
            sub="SUBMITTED"
          />
        )}
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.id} — ${ugx(selected.penalty)}` : ""}
        subtitle={selected ? `${selected.plate} · ${selected.violationLabel}` : undefined}
        footer={
          selected &&
          tab === "outstanding" && (
            <button type="button" className="btn" disabled={!canPay} onClick={() => pay(selected)}>
              Submit {method} payment
            </button>
          )
        }
      >
        {selected && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-soft p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">Notice</p>
                <dl className="kv mt-3">
                  <dt>Case</dt>
                  <dd className="font-mono">{selected.id}</dd>
                  <dt>Plate</dt>
                  <dd>
                    <Plate>{selected.plate}</Plate>
                  </dd>
                  <dt>Violation</dt>
                  <dd>{selected.violationLabel}</dd>
                  <dt>Location</dt>
                  <dd>{selected.location}</dd>
                </dl>
              </div>
              <div className="glass-soft p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">Amount due</p>
                <p className="mt-3 font-mono text-2xl font-bold text-gold">{ugx(selected.penalty)}</p>
                <p className="mt-2 text-xs text-muted-2">
                  Payable within 30 days of issue. Late payment attracts a 25% surcharge.
                </p>
                {payments[selected.id] && (
                  <p className="mt-3 text-xs text-blue">
                    Already submitted: {payments[selected.id].reference} ({payments[selected.id].method})
                  </p>
                )}
              </div>
            </div>
            {tab === "outstanding" && (
              <div>
                <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">
                  Payment method
                </p>
                <SegmentedControl
                  value={method}
                  onChange={setMethod}
                  options={METHODS.map((m) => ({ value: m, label: m }))}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </PageShell>
  );
}
