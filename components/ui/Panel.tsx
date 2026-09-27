import type { ReactNode } from "react";
import { cx } from "@/lib/util";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions, meta }: PageHeaderProps) {
  return (
    <header className="page-head fade-in">
      <div>
        <span className="eyebrow mb-4">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="lead mt-4 max-w-3xl">{subtitle}</p>}
        {meta && <div className="mt-5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: PanelProps) {
  return (
    <section className={cx("panel", className)}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-muted-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cx(flush ? "" : "panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export interface KpiItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "gold" | "green" | "blue" | "red";
}

export function KpiRow({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <div className={cx("kpi-strip", className)}>
      {items.map((item) => (
        <div key={item.label} className={cx("kpi", item.tone ?? "gold")}>
          <p className="kpi-label">{item.label}</p>
          <p className="kpi-value">{item.value}</p>
          {item.sub && <p className="kpi-sub">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p className="font-semibold text-muted">{title}</p>
      {hint && <p className="mt-2 text-xs">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="panel-title">{children}</h2>
      {hint && <span className="text-xs text-muted-2">{hint}</span>}
    </div>
  );
}
