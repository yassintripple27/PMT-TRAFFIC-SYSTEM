"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

export interface HeroImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export interface HeroProps {
  title: string;
  subtitle: string;
  image?: HeroImage;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export function Hero({ 
  title, 
  subtitle, 
  image, 
  primaryCtaText, 
  primaryCtaHref, 
  secondaryCtaText,
  secondaryCtaHref 
}: HeroProps) {
  const [visible, setVisible] = useState(false);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (headlineRef.current) {
      observer.observe(headlineRef.current);
    }
  }, []);

  return (
    <section className="relative min-h-[70vh] bg-bg overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" 
             style={{ 
               background: "radial-gradient(1100px 620px at 12% -8%, rgba(255, 201, 60, 0.09), transparent 60%), radial-gradient(900px 560px at 92% 4%, rgba(59, 167, 255, 0.07), transparent 62%), radial-gradient(1000px 700px at 50% 110%, rgba(255, 77, 77, 0.05), transparent 60%)" 
             }} />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/80 to-bg/80" />
      </div>

      {/* Image area */}
      {image && (
        <div className="absolute inset-0">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            fill
            priority
            className="object-cover"
          />
        </div>
      )}

      {/* Hero inner */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
        <div className="eyebrow mb-4">Republic of Uganda · National Traffic Intelligence Prototype</div>

        <h1 
          ref={headlineRef}
          className="display mb-6 font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter text-text"
        >
          {title}
        </h1>

        <p className="lead mb-8 text-muted max-w-2xl">
          {subtitle}
        </p>

        <div className="hero-actions mb-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href={primaryCtaHref}
            className="btn btn-gold"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="16" 
              height="16" 
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            {primaryCtaText}
          </a>

          {secondaryCtaText && secondaryCtaHref && (
            <a
              href={secondaryCtaHref}
              className="btn btn-outline"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16" 
                fill="currentColor"
              >
                <path d="M4 7h11v10H4zm11 3l5-3v10l-5-3z" />
              </svg>
              {secondaryCtaText}
            </a>
          )}
        </div>

        {/* Hero stats */}
        <div className="hero-stats mt-auto flex gap-2 justify-center">
          <div className="hero-stat">
            <b data-count="248" className="font-mono font-extrabold">
              {visible ? "248" : "0"}
            </b>
            <span>Cameras connected</span>
          </div>
          <div className="hero-stat">
            <b data-count="17" className="font-mono font-extrabold">
              {visible ? "17" : "0"}
            </b>
            <span>Districts covered</span>
          </div>
          <div className="hero-stat">
            <b data-count="204" className="font-mono font-extrabold">
              {visible ? "204" : "0"}
            </b>
            <span>IoT devices online</span>
          </div>
          <div className="hero-stat">
            <b data-count="9" className="font-mono font-extrabold">
              {visible ? "9" : "0"}
            </b>
            <span>AI vision modules</span>
          </div>
        </div>

        {/* Notice */}
        <div className="notice mt-8 max-w-2xl text-center px-4">
          <svg 
            viewBox="0 0 24 24" 
            width="17" 
            height="17" 
            fill="currentColor"
          >
            <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
          </svg>
          <div>
            <b>Demonstration prototype.</b> Every camera feed, detection, plate, incident and fine shown on this
            site is generated locally by the PTM simulation engine. No live Ugandan government or police camera
            is accessed, and no real personal data is displayed.
          </div>
        </div>
      </div>
    </section>
  );
}