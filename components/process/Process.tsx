"use client";

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
  subtitle?: string;
}

export interface ProcessProps {
  title: string;
  steps: ProcessStep[];
  subtitle?: string;
}

export function Process({ 
  title, 
  steps,
  subtitle 
}: ProcessProps) {
  return (
    <section className="py-24 relative bg-bg/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="eyebrow uppercase tracking-wider mb-3 block">How it works</span>
          <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-2 text-lg mt-2">
              {subtitle}
            </p>
          )}
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[1px] h-full bg-stroke/50"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex flex-col items-center text-center relative z-10"
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div 
                  className="width-12 height-12 rounded-full bg-gold flex items-center justify-center"
                  style={{
                    margin: "0 auto 12px",
                    border: "2px solid var(--bg)"
                  }}
                >
                  <span className="text-xs font-bold text-bg">{step.number}</span>
                </div>

                <h3 className="text-lg font-bold text-text mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-2 text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}