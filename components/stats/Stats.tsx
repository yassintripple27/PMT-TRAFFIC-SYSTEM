import { SectionHeader } from "@/components/section-heading/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export interface StatBlock {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  tone?: "gold" | "green" | "blue" | "red";
}

export interface StatsProps {
  eyebrow?: string;
  title: string | string[];
  subtitle: string;
  stats: StatBlock[];
  ctaText?: string;
  ctaHref?: string;
  /** `band` inverts the block; `inline` keeps it on the page surface. */
  variant?: "band" | "inline";
}

export function Stats({
  eyebrow = "Network telemetry",
  title,
  subtitle,
  stats,
  ctaText,
  ctaHref,
  variant = "band",
}: StatsProps) {
  const isBand = variant === "band";

  return (
    <section
      className={isBand ? "section stat-band" : "section section--top"}
      id={isBand ? "network" : undefined}
    >
      <div className="shell">
        <Reveal>
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            lead={subtitle}
            layout="split"
            action={ctaText && ctaHref ? { label: ctaText, href: ctaHref } : undefined}
            className="mb-16 lg:mb-20"
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-cell">
                <p className="stat-cell__value">
                  {stat.prefix}
                  {typeof stat.value === "number"
                    ? new Intl.NumberFormat().format(stat.value)
                    : stat.value}
                  {stat.suffix}
                </p>
                <p className="stat-cell__label">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
