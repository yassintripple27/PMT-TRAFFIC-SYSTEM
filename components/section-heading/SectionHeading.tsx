"use client";

import { useState, useEffect } from "react";

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  showEyebrow?: boolean;
  eyebrowText?: string;
}

export function SectionHeading({ 
  title, 
  subtitle,
  showEyebrow = true,
  eyebrowText = "System Purpose"
}: SectionHeadingProps) {
  const [visible, setVisible] = useState(false);

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

    const target = document.querySelector('[data-section-heading]');
    if (target) {
      observer.observe(target);
    }
  }, []);

  return (
    <div 
      className="mb-12 fade-in"
      style={{ transitionDelay: visible ? '0s' : '0.2s' }}
      data-section-heading
    >
      {showEyebrow && (
        <span className="eyebrow uppercase tracking-wider block mb-3">
          {eyebrowText}
        </span>
      )}

      <h2 className="display font-extrabold text-[--heading-size] leading-[1.05] tracking-tighter">
        {title}
      </h2>

      {subtitle && (
        <p className="text-muted-2 text-lg mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
}