import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/section-heading/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export interface AboutStats {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  tone?: "gold" | "green" | "blue" | "red";
}

export interface AboutLayer {
  title: string;
  detail: string;
}

export interface AboutProps {
  label: string;
  heading: string | string[];
  paragraph: string;
  /** Primary media — the editorial anchor of the section. */
  image?: { src: string; alt: string; width: number; height: number };
  imageCaption?: string;
  stats?: AboutStats[];
  /** Named layers rendered beneath the copy. Falls back to the platform stack. */
  layers?: AboutLayer[];
  ctaText?: string;
  ctaHref?: string;
  headingLevel?: 1 | 2;
  children?: React.ReactNode;
}

const DEFAULT_LAYERS: AboutLayer[] = [
  {
    title: "Perception layer",
    detail:
      "High-resolution junction cameras, PTZ dome modules and roadside IoT telemetry stream around the clock.",
  },
  {
    title: "Intelligence layer",
    detail:
      "Computer vision models classify vehicle types, perform real-time ANPR and identify road infractions.",
  },
  {
    title: "Enforcement layer",
    detail:
      "Tamper-evident case evidence, automated fines and police dispatch operating under unified command.",
  },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
  </svg>
);

export function About({
  label,
  heading,
  paragraph,
  image,
  imageCaption,
  stats,
  layers = DEFAULT_LAYERS,
  ctaText,
  ctaHref,
  headingLevel = 2,
  children,
}: AboutProps) {
  return (
    <section className="section section--top" id="about">
      <div className="shell">
        <div className="about__grid">
          {/* Copy column */}
          <Reveal className="about__copy">
            <SectionHeader
              eyebrow={label}
              title={heading}
              as={headingLevel === 1 ? "h1" : "h2"}
              headingClassName={headingLevel === 1 ? "t-display" : undefined}
            />

            <p className="t-body mt-9">{paragraph}</p>

            {stats && stats.length > 0 && (
              <dl className="about__stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="about__stat">
                    <dd className="about__stat-value">
                      {stat.prefix}
                      {typeof stat.value === "number"
                        ? new Intl.NumberFormat().format(stat.value)
                        : stat.value}
                      {stat.suffix}
                    </dd>
                    <dt className="about__stat-label">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            {children}

            {ctaText && ctaHref && (
              <Link className="btn mt-12" href={ctaHref}>
                <span>{ctaText}</span>
                <Arrow />
              </Link>
            )}
          </Reveal>

          {/* Media column — deliberately narrower than the copy for asymmetry */}
          <Reveal className="about__aside" delay={90}>
            {image && (
              <figure className="media media--tall media--zoom">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 42vw, 100vw"
                />
                {imageCaption && <figcaption className="media__caption">{imageCaption}</figcaption>}
              </figure>
            )}
          </Reveal>
        </div>

        {/* Platform stack runs full width beneath the pair, breaking the two-column rhythm */}
        <Reveal className="about__layers">
          <div className="layer-list">
            {layers.map((layer, index) => (
              <div key={layer.title} className="layer-row">
                <span className="layer-row__num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="t-h4">{layer.title}</h3>
                  <p className="t-small mt-2">{layer.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
