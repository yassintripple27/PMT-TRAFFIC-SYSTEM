"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cx } from "@/lib/util";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Stagger in ms — use sparingly, only for sibling blocks of one group. */
  delay?: number;
}

/**
 * One-shot fade + rise on first intersection. Respects reduced motion via CSS.
 * Opt-in only: applied to major section blocks, never to every element.
 */
export function Reveal({ children, className, as, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      ref={ref}
      className={cx("reveal", className)}
      data-visible={visible ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
