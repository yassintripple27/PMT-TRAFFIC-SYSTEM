"use client";

export interface AboutStats {
  label: string;
  value: string;
  prefix?: string;
}

export interface AboutProps {
  label: string;
  heading: string;
  paragraph: string;
  stats?: AboutStats[];
  ctaText?: string;
  ctaHref?: string;
}

export function About({ 
  label, 
  heading, 
  paragraph, 
  stats,
  ctaText,
  ctaHref 
}: AboutProps) {
  return (
    <section className="py-24 relative bg-bg/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="eyebrow uppercase tracking-wider mb-3 block">{label}</span>
            <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter mb-6">
              {heading}
            </h2>
            <p className="text-muted-2 text-lg leading-relaxed">
              {paragraph}
            </p>

            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <p className="display font-extrabold text-gold">{stat.value}</p>
                    <p className="text-muted-2 text-sm uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {ctaText && ctaHref && (
              <div className="mt-8">
                <a
                  href={ctaHref}
                  className="btn btn-gold"
                >
                  {ctaText}
                </a>
              </div>
            )}
          </div>

          {/* Visual element on larger screens */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden bg-stroke/50">
              <div className="h-full w-full bg-gradient-to-br from-gold-soft to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}