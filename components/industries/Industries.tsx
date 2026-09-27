import { SectionHeader } from "@/components/section-heading/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export interface Industry {
  key: string;
  title: string;
  description: string;
}

export interface IndustriesProps {
  eyebrow?: string;
  title: string | string[];
  lead?: string;
  industries: Industry[];
}

export function Industries({
  eyebrow = "Deployment sectors",
  title,
  lead = "Corridor intelligence is commissioned by public safety, logistics and infrastructure operators across the country.",
  industries,
}: IndustriesProps) {
  return (
    <section className="section section--top" id="industries">
      <div className="shell">
        <Reveal>
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            layout="split"
            className="mb-16 lg:mb-20"
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="compact-list">
            {industries.map((industry, index) => (
              <div key={industry.key} className="compact-row">
                <span className="index-row__num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="compact-row__body">
                  <h3 className="t-h3">{industry.title}</h3>
                  <p className="t-small mt-2 max-w-[52ch]">{industry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
