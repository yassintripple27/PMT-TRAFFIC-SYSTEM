"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface NavLink {
  key: string;
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "command", label: "Command Center", href: "/command-center" },
  { key: "cameras", label: "Live Cameras", href: "/cameras" },
  { key: "violations", label: "Violations", href: "/violations" },
  { key: "fines", label: "Fines & Payments", href: "/fines" },
  { key: "map", label: "Uganda Map", href: "/map" },
  { key: "iot", label: "IoT", href: "/iot" },
  { key: "analytics", label: "Analytics", href: "/analytics" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      const scrollY = window.pageYOffset;
      
      sections.forEach(section => {
        const sectionElement = section as HTMLElement;
        const sectionTop = sectionElement.offsetTop - 100;
        const sectionHeight = sectionElement.clientHeight;
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
          setActiveSection(section.getAttribute("id") || "home");
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-stroke/60 py-2">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link
              className="flex items-center gap-2"
              href="/"
              passHref
            >
              <span className="w-6 h-6 rounded-xl bg-gold flex items-center justify-center">
                PTM
              </span>
              <span className="text-text font-bold text-lg tracking-wider">PTM</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <nav>
              <ul className="flex gap-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.key}>
                    <Link
                      className={[
                        "nav-link",
                        activeSection === link.key && "nav-link-active",
                        "transition-colors",
                      ].join(" ")}
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              className="btn btn-gold"
              href="/command-center"
            >
              Enter Command Center
            </a>
            <button
              className="btn btn-ghost hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-md">
          <div className="max-w-2xl mx-auto py-12">
            <nav className="flex flex-col gap-6">
              <ul>
                {NAV_LINKS.map((link) => (
                  <li key={link.key}>
                    <Link
                      className="block py-3 px-4 rounded-xl text-lg transition-colors"
                        href={link.href}
                        style={{ color: activeSection === link.key ? "var(--gold)" : "var(--text)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-8 border-t border-stroke/60">
                <a
                  className="w-full btn btn-gold py-3 rounded-xl text-center"
                  href="/command-center"
                >
                  Enter Command Center
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}
    </nav>
  );
}