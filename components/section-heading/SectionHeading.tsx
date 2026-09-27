import Link from "next/link";
import { cx } from "@/lib/util";

export interface SectionHeaderProps {
  /** Small label above the heading. */
  eyebrow?: string;
  /** Heading text. Pass an array for deliberate line breaks. */
  title: string | string[];
  /** Short supporting copy — one or two sentences at most. */
  lead?: string;
  /** Optional editorial link, placed to the right on wide layouts. */
  action?: { label: string; href: string };
  /** `split` puts the heading in a left column and the lead in a right one. */
  layout?: "stack" | "split";
  as?: "h1" | "h2";
  headingClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

const HEADING_SIZE: Record<"h1" | "h2", string> = {
  h1: "t-display",
  h2: "t-h1",
};

export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  layout = "stack",
  as = "h2",
  headingClassName,
  className,
  children,
}: SectionHeaderProps) {
  const lines = Array.isArray(title) ? title : [title];
  const Heading = as;
  const isSplit = layout === "split";

  return (
    <div
      className={cx(
        "flex flex-col",
        isSplit
          ? "gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16"
          : "gap-6",
        className,
      )}
    >
      {/* Percentage rather than `ch`: display type needs room for the line
          breaks the caller supplied, and `ch` tracks the "0" glyph. */}
      <div className={cx(isSplit ? "lg:w-[54%] lg:shrink-0" : "max-w-[min(100%,26ch)]")}>
        {eyebrow && <span className="eyebrow mb-7">{eyebrow}</span>}
        <Heading className={cx(HEADING_SIZE[as], headingClassName)}>
          {lines.map((line, i) => (
            <span key={line} className={cx("block", i > 0 && "text-muted")}>
              {line}
            </span>
          ))}
        </Heading>
      </div>

      {(lead || action || children) && (
        <div
          className={cx(
            "flex flex-col gap-7",
            isSplit ? "lg:max-w-[46ch] lg:items-start" : "max-w-[58ch]",
          )}
        >
          {lead && <p className="t-lead">{lead}</p>}
          {children}
          {action && (
            <Link
              className="arrow-link self-start"
              href={action.href}
            >
              <span>{action.label}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
              </svg>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
