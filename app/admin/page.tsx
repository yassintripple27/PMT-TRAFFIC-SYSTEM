"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, SegmentedControl, Toolbar, Tabs } from "@/components/ui/Controls";
import { DonutChart } from "@/components/ui/Charts";
import { Modal, useToasts } from "@/components/ui/Modal";
import {
  CASES,
  DEVICES,
  FLEET_KPI,
  OFFICERS,
  ROLES,
  roleLabel,
  type Officer,
} from "@/lib/data";
import { ago, dateTime, num, ugx } from "@/lib/util";
import { useAudit, useLocalState, useSession } from "@/lib/store";

type Tab = "users" | "roles" | "audit";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [selected, setSelected] = useState<Officer | null>(null);
  const { session, signIn, can } = useSession();
  const { log, record } = useAudit();
  const [officers, setOfficers] = useLocalState<Officer[]>("officers", OFFICERS);
  const { items, push, dismiss } = useToasts();

  const isSuper = !session || can("users");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return officers.filter(
      (o) =>
        (role === "ALL" || o.role === role) &&
        (!q || [o.name, o.officerId, o.station].some((f) => f.toLowerCase().includes(q))),
    );
  }, [officers, query, role]);

  const roleMix = useMemo(
    () =>
      ROLES.map((r, i) => ({
        label: r.label,
        value: officers.filter((o) => o.role === r.key).length,
        color: ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-6)", "var(--viz-4)", "var(--viz-7)"][i % 6],
      })).filter((s) => s.value > 0),
    [officers],
  );

  const toggleActive = (o: Officer) => {
    setOfficers((prev) => prev.map((x) => (x.id === o.id ? { ...x, active: !x.active } : x)));
    record("USER_STATUS_CHANGED", { user: o.id, active: !o.active }, session);
    push(`${o.name} ${o.active ? "deactivated" : "reactivated"}`, o.active ? "red" : "green");
  };

  const columns: Column<Officer>[] = [
    { key: "name", header: "Name", render: (o) => <span className="text-text">{o.name}</span> },
    { key: "id", header: "Officer ID", render: (o) => <span className="font-mono text-xs">{o.officerId}</span> },
    { key: "role", header: "Role", render: (o) => roleLabel(o.role) },
    { key: "station", header: "Station", render: (o) => o.station },
    {
      key: "2fa",
      header: "2FA",
      render: (o) => <StatusBadge status={o.twoFA ? "APPROVED" : "PENDING APPROVAL"} />,
    },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.active ? "ACTIVE" : "PENDING APPROVAL"} /> },
    { key: "last", header: "Last login", render: (o) => <span className="font-mono text-xs">{ago(o.lastLogin)}</span> },
    { key: "created", header: "Created", render: (o) => <span className="font-mono text-xs">{o.created}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Users", value: num(officers.length), tone: "blue" },
        { label: "Session", value: session ? roleLabel(session.role) : "guest", tone: session ? "green" : "gold" },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Governance</span>
          <h1 className="page-title">System Administration</h1>
          <p className="lead mt-4 max-w-3xl">
            User accounts, role permissions and the immutable audit trail for every verification,
            rule change, dispatch and payment recorded by the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/iot" className="btn btn-ghost">
            Device health
          </Link>
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "User accounts", value: num(officers.length), sub: "across 6 roles", tone: "gold" },
          { label: "Active", value: num(officers.filter((o) => o.active).length), sub: "enabled", tone: "green" },
          { label: "2FA enabled", value: num(officers.filter((o) => o.twoFA).length), sub: "recommended", tone: "blue" },
          { label: "Audit entries", value: num(log.length), sub: "this session", tone: "gold" },
        ]}
      />

      <div className="console-grid split mb-6">
        <Panel flush>
          <div className="p-4">
            <Tabs
              value={tab}
              onChange={setTab}
              options={[
                { value: "users", label: "Users", badge: officers.length },
                { value: "roles", label: "Roles & permissions", badge: ROLES.length },
                { value: "audit", label: "Audit trail", badge: log.length },
              ]}
            />
            {tab === "users" && (
              <>
                <Toolbar>
                  <SearchInput value={query} onChange={setQuery} placeholder="Search name, ID or station…" />
                  <SegmentedControl
                    value={role}
                    onChange={setRole}
                    options={[
                      { value: "ALL", label: "All roles" },
                      ...ROLES.map((r) => ({ value: r.key, label: r.label })),
                    ]}
                  />
                </Toolbar>
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(o) => o.id}
                  onRowClick={setSelected}
                  empty="No users match the current filters."
                />
              </>
            )}
            {tab === "roles" && (
              <div className="grid-cards">
                {ROLES.map((r) => (
                  <div key={r.key} className="grid-card">
                    <p className="text-sm font-semibold text-text">{r.label}</p>
                    <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-2">{r.key}</p>
                    <p className="mt-3 text-xs leading-relaxed text-muted">{r.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {r.perms.map((p) => (
                        <span key={p} className="badge badge-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-2">
                      {num(officers.filter((o) => o.role === r.key).length)} users assigned
                    </p>
                  </div>
                ))}
              </div>
            )}
            {tab === "audit" && (
              <>
                {log.length === 0 ? (
                  <p className="text-sm text-muted-2">
                    No audit entries in this browser session. Verify a case, change a detection rule
                    or dispatch a unit to generate entries.
                  </p>
                ) : (
                  <DataTable
                    columns={[
                      { key: "ts", header: "Timestamp", render: (e) => <span className="font-mono text-xs">{dateTime(new Date(e.ts))}</span> },
                      { key: "action", header: "Action", render: (e) => <span className="font-mono text-xs text-gold">{e.action}</span> },
                      { key: "actor", header: "Actor", render: (e) => e.actor },
                      { key: "role", header: "Role", render: (e) => roleLabel(e.role) },
                      { key: "detail", header: "Detail", render: (e) => <span className="font-mono text-xs text-muted-2">{JSON.stringify(e.detail)}</span> },
                    ]}
                    rows={log}
                    rowKey={(e) => e.id}
                    empty="No audit entries."
                  />
                )}
              </>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Role distribution">
            <DonutChart segments={roleMix} center={num(officers.length)} sub="USERS" />
          </Panel>

          <Panel title="Platform footprint">
            <dl className="kv">
              <dt>Cameras</dt>
              <dd className="font-mono">{num(FLEET_KPI.total)}</dd>
              <dt>Online</dt>
              <dd className="font-mono text-green">{num(FLEET_KPI.online)}</dd>
              <dt>IoT devices</dt>
              <dd className="font-mono">{num(DEVICES.length)}</dd>
              <dt>Cases</dt>
              <dd className="font-mono">{num(CASES.length)}</dd>
              <dt>Revenue collected</dt>
              <dd className="font-mono text-gold">
                {ugx(CASES.filter((c) => c.status === "PAID").reduce((s, c) => s + c.penalty, 0))}
              </dd>
            </dl>
          </Panel>

          <Panel title="Session">
            <p className="text-xs leading-relaxed text-muted-2">
              {session
                ? `Signed in as ${session.user.name} (${roleLabel(session.role)}). Changes you make are stored in this browser only.`
                : "No active admin session. User status changes are available in demo mode and stored locally."}
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.officerId} · ${roleLabel(selected.role)}` : undefined}
        footer={
          selected && (
            <button type="button" className={selected.active ? "btn btn-ghost" : "btn"} onClick={() => toggleActive(selected)}>
              {selected.active ? "Deactivate account" : "Reactivate account"}
            </button>
          )
        }
      >
        {selected && (
          <>
            {!isSuper && (
              <p className="rounded-[14px] border border-[var(--viz-2)]/30 bg-[var(--viz-2)]/10 px-4 py-3 text-xs text-blue">
                Account changes require a super admin session. Demo mode still allows the change.
              </p>
            )}
            <dl className="kv">
              <dt>Role</dt>
              <dd>{roleLabel(selected.role)}</dd>
              <dt>Station</dt>
              <dd>{selected.station}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={selected.active ? "ACTIVE" : "PENDING APPROVAL"} />
              </dd>
              <dt>Two-factor</dt>
              <dd>{selected.twoFA ? "Enabled" : "Not enabled"}</dd>
              <dt>Last login</dt>
              <dd className="font-mono text-xs">{dateTime(new Date(selected.lastLogin))}</dd>
              <dt>Account created</dt>
              <dd className="font-mono text-xs">{selected.created}</dd>
            </dl>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => {
                signIn(selected);
                push(`Impersonating ${selected.name} for preview`, "blue");
                setSelected(null);
              }}
            >
              Preview as this user
            </button>
          </>
        )}
      </Modal>
    </PageShell>
  );
}
