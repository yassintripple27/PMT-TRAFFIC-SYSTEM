import { SectionHeader } from "@/components/section-heading/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
  subtitle?: string;
}

export interface ProcessProps {
  title: string | string[];
  eyebrow?: string;
  lead?: string;
  steps: ProcessStep[];
}

export function Process({
  title,
  eyebrow = "Execution workflow",
  lead = "From corridor planning to issued penalty, every stage is captured on one auditable record.",
  steps,
}: ProcessProps) {
  return (
    <section className="section section--top" id="workflow">
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
          <ol className="phase-grid">
            {steps.map((step) => (
              <li key={step.number} className="phase">
                <span className="phase__num" aria-hidden="true">
                  {String(step.number).padStart(2, "0")}
                </span>
                <h3 className="phase__title">
                  {step.title}
                  {step.subtitle && <span className="sr-only"> — {step.subtitle}</span>}
                </h3>
                <p className="phase__body">{step.description}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
