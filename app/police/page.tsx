"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { KpiRow, Panel } from "@/components/ui/Panel";
import { Plate, SeverityDot, StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput, Select, Toolbar } from "@/components/ui/Controls";
import { Modal, useToasts } from "@/components/ui/Modal";
import {
  CASES,
  DISTRICTS,
  INCIDENTS,
  OFFICERS,
  activeIncidents,
  officerById,
  roleLabel,
  type Incident,
} from "@/lib/data";
import { ago, num, pad } from "@/lib/util";
import { useAudit, useSession } from "@/lib/store";

export default function PolicePage() {
  const { session, signIn, signOut, can } = useSession();
  const { log, record } = useAudit();
  const { items, push, dismiss } = useToasts();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | Incident["status"]>("ALL");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [officerId, setOfficerId] = useState("");

  const officer = session ? officerById(session.user.id) : null;
  const locked = (perm: string) => Boolean(session) && !can(perm);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INCIDENTS.filter(
      (i) =>
        (district === "ALL" || i.district === district) &&
        (status === "ALL" || i.status === status) &&
        (!q || [i.id, i.location, i.typeLabel, i.plate ?? ""].some((f) => f.toLowerCase().includes(q))),
    );
  }, [query, district, status]);

  const mine = useMemo(
    () => (officer ? CASES.filter((c) => c.verifiedBy?.includes(officer.name.split(" ").pop() ?? "")) : []),
    [officer],
  );

  const dispatch = (i: Incident, unit: string) => {
    record("UNIT_DISPATCHED", { incident: i.id, unit, district: i.district }, session);
    push(`${unit} dispatched to ${i.id} at ${i.location}`, "green");
    setSelected(null);
  };

  const signInAs = (id: string) => {
    const u = OFFICERS.find((o) => o.id === id);
    if (!u) return;
    setOfficerId(id);
    signIn(u);
    record("SESSION_STARTED", { role: u.role, station: u.station }, null);
    push(`Signed in as ${u.name} — ${roleLabel(u.role)}`, "gold");
  };

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
    { key: "district", header: "District", render: (i) => i.district },
    { key: "plate", header: "Plate", render: (i) => (i.plate ? <Plate>{i.plate}</Plate> : "—") },
    {
      key: "unit",
      header: "Unit",
      render: (i) => <span className="font-mono text-xs">{i.assignedUnit ?? "unassigned"}</span>,
    },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "ts", header: "Reported", render: (i) => <span className="font-mono text-xs">{ago(i.ts)}</span> },
  ];

  return (
    <PageShell
      toasts={items}
      onDismissToast={dismiss}
      status={[
        { label: "Open incidents", value: num(activeIncidents().length), tone: "red" },
        {
          label: "Session",
          value: session ? roleLabel(session.role) : "guest",
          tone: session ? "green" : "blue",
        },
      ]}
    >
      <div className="page-head fade-in">
        <div>
          <span className="eyebrow mb-4">Field operations</span>
          <h1 className="page-title">Police Operations Desk</h1>
          <p className="lead mt-4 max-w-3xl">
            Incident queue, unit dispatch and jurisdiction-scoped camera access for uniformed
            officers. Sign in with a demo identity to unlock dispatch and verification actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {session ? (
            <>
              <span className="badge badge-verified">
                {officer?.name} · {roleLabel(session.role)}
              </span>
              <button type="button" className="btn btn-ghost" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Select
                value={officerId}
                onChange={signInAs}
                label="Sign in as"
                options={[
                  { value: "", label: "Select demo officer…" },
                  ...OFFICERS.map((o) => ({ value: o.id, label: `${o.name} — ${roleLabel(o.role)}` })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <KpiRow
        className="mb-6"
        items={[
          { label: "Open incidents", value: num(activeIncidents().length), sub: "nationwide", tone: "red" },
          { label: "Units deployed", value: num(INCIDENTS.filter((i) => i.assignedUnit).length), sub: "assigned", tone: "gold" },
          { label: "On scene", value: num(INCIDENTS.filter((i) => i.status === "ON SCENE").length), sub: "responding", tone: "green" },
          { label: "Cases handled", value: num(mine.length), sub: session ? "this officer" : "sign in to see", tone: "blue" },
        ]}
      />

      <div className="console-grid sidebar">
        <div className="flex flex-col gap-6">
          <Panel title="Jurisdiction" subtitle={officer ? officer.station : "Select an officer to scope the queue"}>
            <dl className="kv">
              <dt>Officer</dt>
              <dd>{officer?.name ?? "not signed in"}</dd>
              <dt>Role</dt>
              <dd>{officer ? roleLabel(officer.role) : "guest (read-only)"}</dd>
              <dt>Station</dt>
              <dd>{officer?.station ?? "—"}</dd>
              <dt>Officer ID</dt>
              <dd className="font-mono text-xs">{officer?.officerId ?? "—"}</dd>
              <dt>2FA</dt>
              <dd>{officer ? (officer.twoFA ? "Enabled" : "Not enabled") : "—"}</dd>
            </dl>
          </Panel>

          <Panel
            title="Dispatch authority"
            subtitle={session ? "Permissions held by the current role" : "Guest preview — sign in to apply real role permissions"}
          >
            <ul className="feat-list text-xs">
              {["View incident queue", "View nearby cameras", "Dispatch units", "Verify cases"].map((p) => {
                const key = p.toLowerCase().includes("dispatch")
                  ? "dispatch"
                  : p.toLowerCase().includes("verify")
                    ? "verify"
                    : p.toLowerCase().includes("camera")
                      ? "cameras"
                      : "incidents";
                const allowed = session ? can(key) : true;
                return (
                  <li key={p} className="feat-row">
                    <StatusBadge status={!session ? "INFO" : allowed ? "APPROVED" : "PENDING APPROVAL"} />
                    <span className="text-muted">{p}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Activity log" subtitle={`${log.length} entries this session`}>
            {log.length === 0 ? (
              <p className="text-xs text-muted-2">No activity recorded yet.</p>
            ) : (
              <ul className="feat-list text-xs">
                {log.slice(0, 8).map((e) => (
                  <li key={e.id} className="feat-row">
                    <span className="font-mono text-gold">{e.action}</span>
                    <span className="flex-1 text-muted-2">{e.actor}</span>
                    <span className="font-mono text-muted-2">{ago(e.ts)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Jurisdiction notes">
            <p className="text-xs leading-relaxed text-muted-2">
              Access is scoped to the officer&rsquo;s station by default. National visibility requires
              the traffic admin or commander role. Every dispatch and verification is written to the
              audit log with the officer ID and timestamp.
            </p>
            <Link href="/command-center" className="btn btn-ghost mt-4 w-full">
              Command center
            </Link>
          </Panel>
        </div>

        <Panel
          title="Incident queue"
          subtitle={`${num(rows.length)} incidents · ${district === "ALL" ? "national" : district}`}
          flush
        >
          <div className="p-4">
            <Toolbar>
              <SearchInput value={query} onChange={setQuery} placeholder="Search incident, location, plate…" />
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
                value={status}
                onChange={setStatus}
                label="Status"
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "RESPONDING", label: "Responding" },
                  { value: "ON SCENE", label: "On scene" },
                  { value: "PENDING VERIFICATION", label: "Pending verification" },
                  { value: "RESOLVED", label: "Resolved" },
                ]}
              />
            </Toolbar>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(i) => i.id}
              onRowClick={setSelected}
              maxHeight="640px"
              empty="No incidents match the current filters."
            />
          </div>
        </Panel>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.id} — ${selected.typeLabel}` : ""}
        subtitle={selected ? `${selected.location} · ${selected.district}` : undefined}
        footer={
          selected && (
            <div className="flex flex-wrap items-center gap-2">
              {["UNIT PTM-" + pad(7, 3), "UNIT PTM-" + pad(19, 3), "UNIT PTM-" + pad(42, 3)].map((u) => (
                <button
                  key={u}
                  type="button"
                  className="btn"
                  disabled={locked("dispatch")}
                  onClick={() => dispatch(selected, u)}
                >
                  Dispatch {u}
                </button>
              ))}
            </div>
          )
        }
      >
        {selected && (
          <>
            {!can("dispatch") && (
              <p className="rounded-[14px] border border-[var(--viz-2)]/30 bg-[var(--viz-2)]/10 px-4 py-3 text-xs text-blue">
                Dispatch requires a commander or traffic admin session. Sign in with a demo officer
                above to enable it.
              </p>
            )}
            <dl className="kv">
              <dt>Severity</dt>
              <dd>
                <SeverityDot severity={selected.severity} /> {selected.severity.toUpperCase()}
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
              <dt>Camera</dt>
              <dd className="font-mono">{selected.camId}</dd>
              <dt>GPS</dt>
              <dd className="font-mono text-xs">{selected.gps}</dd>
              <dt>Plate</dt>
              <dd>{selected.plate ? <Plate>{selected.plate}</Plate> : "not identified"}</dd>
              <dt>Assigned unit</dt>
              <dd className="font-mono text-xs">{selected.assignedUnit ?? "unassigned"}</dd>
              <dt>Distance</dt>
              <dd className="font-mono text-xs">{selected.distanceKm ?? "—"} km</dd>
              <dt>Reported</dt>
              <dd className="font-mono text-xs">{ago(selected.ts)}</dd>
            </dl>
          </>
        )}
      </Modal>
    </PageShell>
  );
}
