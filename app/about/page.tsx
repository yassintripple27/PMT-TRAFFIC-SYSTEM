import { Navbar } from "@/components/navbar/Navbar";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/about/About";
import { Stats } from "@/components/stats/Stats";
import { CTA } from "@/components/cta/CTA";
import { Footer } from "@/components/footer/Footer";

const HERO_IMAGE = {
  src: "/images/command-center-console.jpg",
  alt: "Police Traffic Management operations console",
  width: 1600,
  height: 1000,
};

const EVIDENCE_IMAGE = {
  src: "/images/anpr-evidence-capture.jpg",
  alt: "Automatic number plate recognition capturing sealed violation evidence",
  width: 1600,
  height: 1000,
};

const CTA_IMAGE = {
  src: "/images/ai-vision-telemetry.jpg",
  alt: "Computer vision pipeline classifying traffic in real time",
  width: 1600,
  height: 1000,
};

const platformStats = [
  { label: "Detection accuracy", value: "97.4%" },
  { label: "Avg. response", value: "1.2s" },
  { label: "Evidence integrity", value: "100%" },
  { label: "Officer roles", value: 8 },
];

const LAYERS = [
  {
    title: "Perception layer",
    detail:
      "Junction cameras, PTZ dome modules and roadside IoT telemetry stream 24/7 data into the platform.",
  },
  {
    title: "Intelligence layer",
    detail:
      "Computer vision classifies vehicle types, performs real-time ANPR and identifies configured infractions.",
  },
  {
    title: "Enforcement layer",
    detail:
      "Tamper-evident evidence, automated fines and police dispatch operate under one command authority.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero
          title="Police Traffic Management System"
          titleLines={["Police Traffic", "Management", "System"]}
          eyebrow="About PTM"
          subtitle="Smart cameras, automatic number plate recognition, violation detection, evidence management and real-time police operations for Uganda."
          image={HERO_IMAGE}
          tag="System online"
          caption="National operations · control surface"
          primaryCtaText="View capabilities"
          primaryCtaHref="/command-center"
          secondaryCtaText="Live cameras"
          secondaryCtaHref="/cameras"
        />

        <About
          label="What PTM is"
          heading={["Technology and", "practical", "enforcement"]}
          paragraph="PTM is an AI and IoT traffic management platform for Uganda. It combines cutting-edge perception technology with the practical demands of roadside enforcement to create safer roads across the nation — and gives every authorised officer the same picture of every corridor."
          image={EVIDENCE_IMAGE}
          imageCaption="ANPR capture · sealed case evidence"
          stats={platformStats}
          layers={LAYERS}
          ctaText="Enter the console"
          ctaHref="/command-center"
        />

        <Stats
          eyebrow="Performance"
          title={["Built for", "operational duty"]}
          subtitle="Performance targets the platform is engineered and measured against."
          stats={platformStats}
          ctaText="See live analytics"
          ctaHref="/analytics"
        />

        <CTA
          title={["See the", "command center"]}
          subtitle="Watch live camera walls, incident alerts and violation triage in one operations surface."
          image={CTA_IMAGE}
          primaryCtaText="Enter Command Center"
          primaryCtaHref="/command-center"
          secondaryCtaText="Back home"
          secondaryCtaHref="/"
        />
      </main>

      <Footer />
    </>
  );
}
