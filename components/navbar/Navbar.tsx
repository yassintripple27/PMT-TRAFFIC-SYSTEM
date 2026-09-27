"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV_LINKS, MODULE_NAV_LINKS } from "@/components/navbar/links";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cx } from "@/lib/util";

export { NAV_LINKS, PRIMARY_NAV_LINKS, MODULE_NAV_LINKS } from "@/components/navbar/links";
export type { NavLink } from "@/components/navbar/links";

const Chevron = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
  </svg>
);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const modulesRef = useRef<HTMLDivElement>(null);
  const modulesTrigger = useRef<HTMLButtonElement>(null);
  const modulesId = useId();

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  /* A route change invalidates the open popover and drawer. Adjusting during
     render (rather than in an effect) avoids the extra commit. */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setModulesOpen(false);
    setMenuOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isModuleActive = MODULE_NAV_LINKS.some((m) => isActive(m.href));

  /* Solid bar only once the hero has scrolled past */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Lock the page behind the mobile drawer */
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  /* Dismiss the module popover on outside click or Escape */
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (modulesRef.current && !modulesRef.current.contains(event.target as Node)) {
        setModulesOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setModulesOpen(false);
      setMenuOpen(false);
      modulesTrigger.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      <header className={cx("nav", scrolled && "nav--solid")}>
        <div className="shell">
          <div className="nav__bar">
            <Link className="brand" href="/" aria-label="PTM home">
              <span className="brand__mark">PTM</span>
              <span className="brand__sub hidden sm:inline">Traffic Intelligence</span>
            </Link>

            <nav className="nav__links" aria-label="Primary">
              {PRIMARY_NAV_LINKS.map((link) => (
                <Link
                  key={link.key}
                  className="nav__link"
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}

              <div className="relative" ref={modulesRef}>
                <button
                  ref={modulesTrigger}
                  type="button"
                  className="nav__link inline-flex items-center gap-1.5"
                  onClick={() => setModulesOpen((open) => !open)}
                  aria-expanded={modulesOpen}
                  aria-controls={modulesId}
                  aria-current={isModuleActive ? "true" : undefined}
                >
                  Modules
                  <Chevron className={cx("transition-transform duration-300", modulesOpen && "rotate-180")} />
                </button>

                {modulesOpen && (
                  <div
                    id={modulesId}
                    className="absolute right-0 top-[calc(100%+14px)] z-50 w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-[var(--r-md)] border border-[var(--elevated-line)] bg-[var(--elevated)] p-2 shadow-[var(--shadow-overlay)] backdrop-blur-xl"
                  >
                    <p className="px-3 pb-2 pt-2 text-[var(--fs-eyebrow)] font-semibold uppercase tracking-[0.16em] text-muted-2">
                      Platform modules
                    </p>
                    <div className="nav__menu">
                      {MODULE_NAV_LINKS.map((mod) => (
                        <Link
                          key={mod.key}
                          href={mod.href}
                          className={cx(
                            "nav__menu-link",
                            isActive(mod.href) && "bg-[var(--panel-2)]",
                          )}
                        >
                          <b>{mod.label}</b>
                          {mod.description && <span>{mod.description}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            <div className="nav__right">
              <span className="live hidden xl:inline-flex">
                <span className="pulse" aria-hidden="true" />
                Network live
              </span>

              <button
                type="button"
                onClick={toggleTheme}
                className="icon-btn"
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="4.5" />
                    <path strokeLinecap="round" d="M12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
                  </svg>
                )}
              </button>

              <Link className="btn btn--sm hidden sm:inline-flex" href="/command-center">
                <span>Command Center</span>
                <Arrow />
              </Link>

              <button
                type="button"
                className="nav-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
                aria-controls="ptm-mobile-nav"
              >
                {menuOpen ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" d="M4 8h16M4 16h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          id="ptm-mobile-nav"
          className="nav-drawer"
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <div className="shell flex min-h-full flex-col py-10">
            <nav aria-label="Mobile primary" className="flex flex-col">
              {PRIMARY_NAV_LINKS.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={cx(
                    "t-h2 border-b border-[var(--stroke)] py-5",
                    isActive(link.href) ? "text-[var(--gold)]" : "text-[var(--text)]",
                  )}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <p className="eyebrow eyebrow--plain mt-12 mb-4">Platform modules</p>
            <div className="flex flex-col">
              {MODULE_NAV_LINKS.map((mod) => (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className="flex flex-col gap-1 border-b border-[var(--stroke)] py-4"
                >
                  <b className="t-h4">{mod.label}</b>
                  {mod.description && <span className="t-micro">{mod.description}</span>}
                </Link>
              ))}
            </div>

            <Link className="btn btn--lg mt-12" href="/command-center">
              <span>Enter Command Center</span>
              <Arrow />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
