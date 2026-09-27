"use client";

import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/util";

export interface HeroImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export interface HeroProps {
  title: string;
  /** Deliberate line breaks for the display headline. Falls back to `title`. */
  titleLines?: string[];
  subtitle: string;
  image?: HeroImage;
  /** Overlaid on the media in the top-left corner. */
  tag?: string;
  /** Editorial caption anchored to the bottom-left of the media. */
  caption?: string;
  eyebrow?: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  metrics?: { value: string; label: string }[];
}

const HERO_METRICS = [
  { value: "248", label: "Cameras connected" },
  { value: "17", label: "Districts covered" },
  { value: "204", label: "IoT sensors online" },
  { value: "9", label: "AI vision models" },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
  </svg>
);

export function Hero({
  title,
  titleLines,
  subtitle,
  image,
  tag,
  caption,
  eyebrow = "Republic of Uganda · National traffic intelligence",
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
  metrics = HERO_METRICS,
}: HeroProps) {
  const lines = titleLines?.length ? titleLines : [title];
  const lastIndex = lines.length - 1;

  return (
    <section className="hero">
      <div className="shell">
        <div className="hero__grid">
          <div className="hero__text">
            <span className="eyebrow mb-9">{eyebrow}</span>

            <h1 className="t-hero hero__lines">
              {lines.map((line, i) => (
                <span key={line} className={cx(i === lastIndex && "text-muted")}>
                  {line}
                </span>
              ))}
            </h1>

            <p className="t-lead mt-10 max-w-[48ch]">{subtitle}</p>

            <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-5">
              <Link className="btn btn--lg" href={primaryCtaHref}>
                <span>{primaryCtaText}</span>
                <Arrow />
              </Link>

              {secondaryCtaText && secondaryCtaHref && (
                <Link className="arrow-link" href={secondaryCtaHref}>
                  <span>{secondaryCtaText}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {image && (
            <div className="hero__media">
              {tag && (
                <span className="hero__tag">
                  <span className="pulse" aria-hidden="true" />
                  {tag}
                </span>
              )}

              <div className="hero__figure">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={image.priority ?? true}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                />
              </div>

              {caption && <span className="media__caption">{caption}</span>}
            </div>
          )}
        </div>

        <div className="hero__metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="hero__metric">
              <p className="hero__metric-value">{metric.value}</p>
              <p className="hero__metric-label">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
