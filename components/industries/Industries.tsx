"use client";

export interface Industry {
  key: string;
  title: string;
  description: string;
}

export interface IndustriesProps {
  title: string;
  industries: Industry[];
}

export function Industries({ 
  title, 
  industries 
}: IndustriesProps) {
  return (
    <section className="py-24 relative bg-bg/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="eyebrow uppercase tracking-wider mb-3 block">Industries</span>
          <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {industries.map((industry) => (
            <div
              key={industry.key}
              className="rounded-2xl border border-stroke/50 bg-panel p-6 transition-all hover:border-gold-line hover:-translate-y-1"
              style={{ transitionDelay: `${industries.indexOf(industry) * 0.1}s` }}
            >
              <div className="feature-icon mb-4">
                <svg 
                  viewBox="0 0 24 24" 
                  width={24} 
                  height={24} 
                  fill="currentColor"
                >
                  <path 
                    d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z" 
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-text mb-1">
                {industry.title}
              </h3>
              <p className="text-muted-2 text-sm line-clamp-2">
                {industry.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}