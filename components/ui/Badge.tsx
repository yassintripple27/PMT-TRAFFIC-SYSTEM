import type { ReactNode } from "react";
import { cx } from "@/lib/util";

const TONE_BY_STATUS: Record<string, string> = {
  PAID: "badge badge-online",
  APPROVED: "badge badge-online",
  ONLINE: "badge badge-online",
  HEALTHY: "badge badge-online",
  VALID: "badge badge-online",
  RESOLVED: "badge badge-verified",
  ACTIVE: "badge badge-online",
  UNPAID: "badge badge-unpaid",
  REJECTED: "badge badge-violation",
  FAULT: "badge badge-violation",
  EXPIRED: "badge badge-violation",
  OFFLINE: "badge badge-offline",
  DEGRADED: "badge badge-caution",
  PENDING: "badge badge-caution",
  "PENDING VERIFICATION": "badge badge-caution",
  "PENDING APPROVAL": "badge badge-caution",
  "PAYMENT PENDING": "badge badge-info",
  "ON SCENE": "badge badge-info",
  RESPONDING: "badge badge-live",
  CRITICAL: "badge badge-violation",
  VIOLATION: "badge badge-violation",
  CLEAR: "badge badge-online",
  WARNING: "badge badge-caution",
  INFO: "badge badge-info",
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const tone = TONE_BY_STATUS[status] ?? "badge";
  return (
    <span className={tone}>
      {dot && status !== "INFO" && <i className="dot" />}
      {status}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      className={cx(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        severity === "critical"
          ? "bg-red"
          : severity === "warning"
            ? "bg-amber"
            : severity === "info"
              ? "bg-blue"
              : "bg-muted-2",
      )}
      aria-hidden="true"
    />
  );
}

export function Plate({ children }: { children: ReactNode }) {
  return <span className="plate">{children}</span>;
}

export function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "gold" | "green" | "blue" | "red";
}) {
  return (
    <div className="glass-soft flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-2">
        {label}
      </span>
      <span
        className={cx(
          "font-mono text-sm font-bold",
          tone === "green" && "text-green",
          tone === "blue" && "text-blue",
          tone === "red" && "text-red",
          (!tone || tone === "gold") && "text-gold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
