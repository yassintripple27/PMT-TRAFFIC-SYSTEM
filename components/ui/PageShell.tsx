"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClock, useHydrated } from "@/lib/clock";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import { StatusBadge } from "@/components/ui/Badge";
import { ToastStack, type ToastItem } from "@/components/ui/Modal";
import { FLEET_KPI } from "@/lib/data";

export interface ShellStatus {
  label: string;
  tone: "gold" | "green" | "blue" | "red";
  value: string;
}

/**
 * Console shell. `app-shell` scopes the dark token set (see globals.css) so the
 * operations surface renders identically whichever theme the marketing pages
 * are in — no hardcoded palette leaks in from the route files.
 */
export function PageShell({
  children,
  clock = true,
  status,
  toasts,
  onDismissToast,
}: {
  children: ReactNode;
  clock?: boolean;
  status?: ShellStatus[];
  toasts?: ToastItem[];
  onDismissToast?: (id: number) => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const tick = useClock();

  return (
    <div className="app-shell">
      <Navbar />

      <div className="console-sub">
        <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Breadcrumb">
          <Link href="/" className="footer__link font-semibold uppercase tracking-widest">
            PTM
          </Link>
          <span aria-hidden="true" className="text-muted-2">
            /
          </span>
          <span className="font-mono font-semibold uppercase tracking-widest text-[var(--text)]">
            {pathname?.replace(/^\//, "") || "overview"}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {status?.map((s) => (
            <span key={s.label} className="badge">
              {s.label} <b className="badge-mono ml-1 font-bold">{s.value}</b>
            </span>
          ))}
          <span className="badge badge-online">
            <span className="dot" />
            {FLEET_KPI.devicesOnline}/{FLEET_KPI.devices} devices online
          </span>
          {clock && hydrated && <span className="badge badge-mono">{tick}</span>}
        </div>
      </div>

      <main className="shell-body">{children}</main>

      <Footer />

      {toasts && onDismissToast && <ToastStack items={toasts} onDismiss={onDismissToast} />}
    </div>
  );
}

export function StatusStrip({
  items,
}: {
  items: { status: string; value: string | number; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2 text-xs text-muted">
          {i.label}
          <StatusBadge status={i.status} />
          <b className="font-mono text-[var(--text)]">{i.value}</b>
        </span>
      ))}
    </div>
  );
}
