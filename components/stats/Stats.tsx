"use client";

export interface StatBlock {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
}

export interface StatsProps {
  title: string;
  subtitle: string;
  stats: StatBlock[];
  ctaText?: string;
  ctaHref?: string;
}

export function Stats({ 
  title, 
  subtitle, 
  stats,
  ctaText,
  ctaHref 
}: StatsProps) {
  return (
    <section className="py-24 relative bg-bg/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter">
            {title}
          </h2>
          <p className="text-muted-2 text-lg mt-2">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center rounded-2xl border border-stroke/50 bg-panel p-6 transition-all hover:border-gold-line"
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <p 
                className="display font-extrabold text-gold"
                style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)" }}
              >
                {typeof stat.value === "number" ? 
                  new Intl.NumberFormat().format(Number(stat.value)) 
                  : String(stat.value)
                }
              </p>
              <p className="text-muted-2 text-sm uppercase tracking-wider mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {ctaText && ctaHref && (
          <div className="mt-12">
            <a
              href={ctaHref}
              className="btn btn-gold w-full py-3 rounded-xl text-center"
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}