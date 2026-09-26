"use client";

export interface CTAProps {
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export function CTA({ 
  title, 
  subtitle, 
  primaryCtaText, 
  primaryCtaHref, 
  secondaryCtaText,
  secondaryCtaHref 
}: CTAProps) {
  return (
    <section className="py-24 relative">
      <div 
        className="relative max-w-7xl mx-auto px-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--bg-2), var(--bg))"
        }}
      >
        <div className="absolute inset-0"></div>

        <div className="relative z-10 text-center">
          <div className="px-6 py-20">
            <span className="eyebrow uppercase tracking-wider mb-4 block">Get Started</span>

            <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter">
              {title}
            </h2>

            <p className="lead text-muted/80 max-w-2xl mx-auto">
              {subtitle}
            </p>

            <div className="hero-actions flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={primaryCtaHref}
                className="btn btn-gold"
              >
                {primaryCtaText}
              </a>

              {secondaryCtaText && secondaryCtaHref && (
                <a
                  href={secondaryCtaHref}
                  className="btn btn-outline"
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}