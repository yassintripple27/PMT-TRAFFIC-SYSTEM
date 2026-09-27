import { Navbar } from "@/components/navbar/Navbar";
import { Hero } from "@/components/hero/Hero";
import { Services } from "@/components/services/Services";
import { About } from "@/components/about/About";
import { Stats } from "@/components/stats/Stats";
import { Process } from "@/components/process/Process";
import { Industries } from "@/components/industries/Industries";
import { CTA } from "@/components/cta/CTA";
import { Footer } from "@/components/footer/Footer";

const HERO_IMAGE = {
  src: "/images/hero-cinematic.jpg",
  alt: "Road corridor under active traffic surveillance at dusk",
  width: 2560,
  height: 1440,
};

const ABOUT_IMAGE = {
  src: "/images/ai-vision-telemetry.jpg",
  alt: "AI vision telemetry feed classifying vehicles across a monitored junction",
  width: 1600,
  height: 1000,
};

const CTA_IMAGE = {
  src: "/images/command-center-console.jpg",
  alt: "Operations command centre monitoring the national corridor network",
  width: 1600,
  height: 1000,
};

const services = [
  {
    id: "1",
    title: "Smart camera monitoring",
    description:
      "Multi-corridor live video from fixed, dome PTZ and junction multi-sensor units, with day and night IR modes and full CCTV timestamping.",
    href: "/cameras",
  },
  {
    id: "2",
    title: "AI vehicle detection",
    description:
      "Continuous computer vision classifies cars, SUVs, pickups, buses, minibuses, trucks, boda bodas, bicycles and pedestrians in every frame.",
    href: "/ai-detection",
  },
  {
    id: "3",
    title: "Number plate recognition",
    description:
      "Automatic ANPR/OCR captures the plate, vehicle make, colour, time and camera location, then checks it against configured traffic rules.",
    href: "/violations",
  },
  {
    id: "4",
    title: "Configurable violation rules",
    description:
      "Speeding, red-light running, wrong-side driving, dangerous overtaking, illegal parking, U-turns and more — thresholds set by authorised administrators.",
    href: "/fines",
  },
  {
    id: "5",
    title: "Sealed evidence records",
    description:
      "Before, during and after frames plus the video clip are attached to a case ID. Evidence access is role-gated and written to the audit log.",
    href: "/about",
  },
  {
    id: "6",
    title: "Live incident map",
    description:
      "Verified incidents, congestion and police units plotted on a Uganda map so commanders can see national traffic state at a glance.",
    href: "/map",
  },
];

const networkStats = [
  { label: "Cameras online", value: 248 },
  { label: "IoT sensors", value: 204 },
  { label: "Districts covered", value: 17 },
  { label: "Uptime", value: "99.6%" },
];

const processSteps = [
  {
    number: 1,
    title: "Plan",
    description: "Define traffic management objectives and corridor requirements",
  },
  {
    number: 2,
    title: "Execute",
    description: "Deploy smart cameras, IoT devices and AI monitoring systems",
  },
  {
    number: 3,
    title: "Track",
    description: "Monitor traffic flow, violations and incident detection in real time",
  },
  {
    number: 4,
    title: "Deliver",
    description: "Generate cases, fines and evidence records for authorised action",
  },
];

const industries = [
  {
    key: "manufacturing",
    title: "Manufacturing",
    description: "Traffic flow management for raw material and product distribution",
  },
  {
    key: "healthcare",
    title: "Healthcare",
    description: "Emergency corridor clearance and ambulance route optimization",
  },
  {
    key: "technology",
    title: "Technology",
    description: "Smart city integration and connected vehicle infrastructure",
  },
  {
    key: "retail",
    title: "Retail",
    description: "Customer traffic analysis and parking management",
  },
  {
    key: "finance",
    title: "Finance",
    description: "Secure transport and ATM logistics coordination",
  },
  {
    key: "energy",
    title: "Energy",
    description: "Fuel transport and pipeline monitoring",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero
          title="AI-Powered Traffic Management for Uganda"
          titleLines={["AI-Powered", "Traffic", "Management", "for Uganda."]}
          eyebrow="Republic of Uganda · National traffic intelligence"
          subtitle="AI cameras, roadside sensors and automatic plate recognition, unified into one command surface for authorised officers."
          image={HERO_IMAGE}
          tag="Corridor live"
          caption="Nakasero Flyover Junction · corridor telemetry"
          primaryCtaText="Enter Command Center"
          primaryCtaHref="/command-center"
          secondaryCtaText="Live traffic"
          secondaryCtaHref="/cameras"
        />

        <Services
          services={services}
          title={["Unified platform for", "national traffic", "surveillance"]}
        />

        <About
          label="System purpose"
          heading={["One command surface for", "cameras, plates", "and penalties"]}
          paragraph="PTM monitors roads through smart cameras and IoT devices, detects vehicles and motorcycles, reads number plates, identifies configured violations, secures evidence, manages penalties and gives authorised officers real-time access to every corridor under one command surface."
          image={ABOUT_IMAGE}
          imageCaption="AI vision telemetry · junction classification"
          ctaText="Learn more"
          ctaHref="/about"
        />

        <Stats
          eyebrow="Network telemetry"
          title={["Network at a", "glance"]}
          subtitle="Live status of the simulated PTM network across the covered districts."
          stats={networkStats}
          ctaText="View full statistics"
          ctaHref="/analytics"
        />

        <Process
          title={["End-to-end", "workflow"]}
          steps={processSteps}
        />

        <Industries
          title={["Served", "industries"]}
          industries={industries}
        />

        <CTA
          title={["Ready to transform", "your traffic", "management?"]}
          subtitle="Join the growing number of Ugandan authorities using PTM to build safer, smarter roads."
          image={CTA_IMAGE}
          primaryCtaText="Get started"
          primaryCtaHref="/command-center"
          secondaryCtaText="Request demo"
          secondaryCtaHref="/about"
        />
      </main>

      <Footer />
    </>
  );
}
