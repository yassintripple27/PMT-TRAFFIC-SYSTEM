import Link from "next/link";
import { FOOTER_SECTIONS } from "@/components/footer/sections";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top">
          <div className="footer__brand">
            <Link className="brand" href="/" aria-label="PTM home">
              <span className="brand__mark">PTM</span>
            </Link>
            <p className="t-body mt-7 max-w-[38ch] text-[var(--fs-small)]">
              PTM connects AI vision cameras, roadside IoT telemetry, automatic number plate
              recognition and police operations into one unified national command platform.
            </p>
            <span className="live mt-8">
              <span className="pulse" aria-hidden="true" />
              Network operational
            </span>
          </div>

          <nav className="footer__nav" aria-label="Footer">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="footer__heading">{section.title}</h2>
                <ul>
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link className="footer__link" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="footer__bottom">
          <p>
            © {new Date().getFullYear()} PTM — Police Traffic Management System. All rights
            reserved.
          </p>
          <p>Republic of Uganda · Traffic Intelligence Division</p>
        </div>
      </div>
    </footer>
  );
}
