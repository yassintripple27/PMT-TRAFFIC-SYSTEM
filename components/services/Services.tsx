import Link from "next/link";
import { SectionHeader } from "@/components/section-heading/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export interface Service {
  id: string;
  title: string;
  description: string;
  href?: string;
}

export interface ServicesProps {
  eyebrow?: string;
  title?: string | string[];
  lead?: string;
  services: Service[];
  action?: { label: string; href: string };
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z" />
  </svg>
);

export function Services({
  eyebrow = "Capabilities",
  title = ["Unified platform for", "national traffic", "surveillance"],
  lead = "PTM connects smart cameras and IoT sensor infrastructure across Uganda to detect vehicles, analyse flow, read number plates, process violations, and empower law enforcement.",
  services,
  action = { label: "View all modules", href: "/command-center" },
}: ServicesProps) {
  return (
    <section className="section section--top" id="capabilities">
      <div className="shell">
        <Reveal>
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            layout="split"
            action={action}
            className="mb-20 lg:mb-24"
          />
        </Reveal>

        <div className="index-list">
          {services.map((service, index) => {
            const number = String(index + 1).padStart(2, "0");

            return (
              <div key={service.id} className="index-row">
                <span className="index-row__num" aria-hidden="true">
                  {number}
                </span>

                <h3 className="index-row__title">
                  {service.href ? (
                    /* The ::after overlay makes the whole row the hit area
                       while keeping the accessible name to the title alone. */
                    <Link className="index-row__link" href={service.href}>
                      {service.title}
                    </Link>
                  ) : (
                    service.title
                  )}
                </h3>

                <p className="index-row__body">{service.description}</p>

                {service.href && (
                  <span className="index-row__cta" aria-hidden="true">
                    <span className="arrow-link">
                      Explore
                      <Arrow />
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
