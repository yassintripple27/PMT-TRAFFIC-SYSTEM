import Image from "next/image";
import Link from "next/link";

export interface CTAProps {
  eyebrow?: string;
  title: string | string[];
  subtitle: string;
  /** Full-bleed closing image. */
  image?: { src: string; alt: string; width: number; height: number };
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
  </svg>
);

export function CTA({
  eyebrow = "Initiate surveillance",
  title,
  subtitle,
  image,
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
}: CTAProps) {
  const lines = Array.isArray(title) ? title : [title];

  return (
    <section className="cta-band on-media">
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
      )}
      <div className="scrim scrim--bottom" aria-hidden="true" />

      <div className="cta-band__inner">
        <div className="shell on-media">
          <div className="max-w-[26ch]">
            <span className="eyebrow mb-8">{eyebrow}</span>
            <h2 className="t-display">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>

          <div className="mt-12 flex max-w-[46ch] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="t-lead">{subtitle}</p>

            <div className="flex shrink-0 flex-wrap items-center gap-4">
              <Link className="btn btn--lg btn--invert" href={primaryCtaHref}>
                <span>{primaryCtaText}</span>
                <Arrow />
              </Link>

              {secondaryCtaText && secondaryCtaHref && (
                <Link className="btn btn--lg btn--invert-outline" href={secondaryCtaHref}>
                  {secondaryCtaText}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
