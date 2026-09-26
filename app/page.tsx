import { Hero } from "@/components/hero/Hero";
import { Services } from "@/components/services/Services";
import { About } from "@/components/about/About";
import { Stats } from "@/components/stats/Stats";
import { Process } from "@/components/process/Process";
import { Industries } from "@/components/industries/Industries";
import { CTA } from "@/components/cta/CTA";
import { Footer } from "@/components/footer/Footer";

export default function Home() {
  const services = [
    {
      id: "1",
      title: "Smart Camera Monitoring",
      description: "Multi-corridor live video from fixed, dome PTZ and junction multi-sensor units, with day and night IR modes and full CCTV timestamping.",
      href: "/cameras",
    },
    {
      id: "2",
      title: "AI Vehicle Detection",
      description: "Continuous computer vision classifies cars, SUVs, pickups, buses, minibuses, trucks, boda bodas, bicycles and pedestrians in every frame.",
      href: "/ai-detection",
    },
    {
      id: "3",
      title: "Number Plate Recognition",
      description: "Automatic ANPR/OCR captures the plate, vehicle make, colour, time and camera location, then checks it against configured traffic rules.",
      href: "/violations",
    },
    {
      id: "4",
      title: "Configurable Violation Rules",
      description: "Speeding, red-light running, wrong-side driving, dangerous overtaking, illegal parking, U-turns and more — thresholds set by authorised administrators.",
      href: "/fines",
    },
    {
      id: "5",
      title: "Sealed Evidence Records",
      description: "Before / during / after frames plus the video clip are attached to a case ID. Evidence access is role-gated and written to the audit log.",
      href: "/about",
    },
    {
      id: "6",
      title: "Live Incident Map",
      description: "Verified incidents, congestion and police units plotted on a Uganda map so commanders can see national traffic state at a glance.",
      href: "/map",
    },
  ];

  const aboutStats = [
    { label: "Years Experience", value: "10+", prefix: "" },
    { label: "Countries Served", value: "50+", prefix: "" },
    { label: "Projects Completed", value: "1,000+", prefix: "" },
    { label: "Support Available", value: "24/7", prefix: "" },
  ];

  const processSteps = [
    { number: 1, title: "Plan", description: "Define traffic management objectives and corridor requirements" },
    { number: 2, title: "Execute", description: "Deploy smart cameras, IoT devices and AI monitoring systems" },
    { number: 3, title: "Track", description: "Monitor traffic flow, violations and incident detection in real-time" },
    { number: 4, title: "Deliver", description: "Generate cases, fines and evidence records for authorised action" },
  ];

  const industries = [
    { key: "manufacturing", title: "Manufacturing", description: "Traffic flow management for raw material and product distribution" },
    { key: "healthcare", title: "Healthcare", description: "Emergency corridor clearance and ambulance route optimization" },
    { key: "technology", title: "Technology", description: "Smart city integration and connected vehicle infrastructure" },
    { key: "retail", title: "Retail", description: "Customer traffic analysis and parking management" },
    { key: "finance", title: "Finance", description: "Secure transport and ATM logistics coordination" },
    { key: "energy", title: "Energy", description: "Fuel transport and pipeline monitoring" },
  ];

  return (
    <main className="flex flex-col min-h-screen">
      <Hero
        title="AI-POWERED TRAFFIC MANAGEMENT FOR UGANDA"
        subtitle="PTM combines AI traffic cameras, IoT devices, real-time video monitoring, automatic number plate recognition and intelligent traffic analysis to support safer and smarter roads across Uganda."
        primaryCtaText="Enter Command Center"
        primaryCtaHref="/command-center"
        secondaryCtaText="Live Traffic"
        secondaryCtaHref="/cameras"
      />

      <section className="py-24 bg-bg/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Services services={services} />
            <About
              label="System Purpose"
              heading="One platform for the whole traffic lifecycle"
              paragraph="PTM monitors roads through smart cameras and IoT devices, detects vehicles and motorcycles, reads number plates, identifies configured violations, secures evidence, manages penalties and gives authorised officers real-time access."
              ctaText="Learn More"
              ctaHref="/about"
            />
          </div>
        </div>
      </section>

      <Stats
        title="At a Glance"
        subtitle="Key metrics from the PTM network"
        stats={aboutStats}
        ctaText="View Full Statistics"
        ctaHref="/analytics"
      />

      <Process
        title="End-to-End Workflow"
        steps={processSteps}
      />

      <Industries
        title="Served Industries"
        industries={industries}
      />

      <CTA
        title="Ready to Transform Your Traffic Management?"
        subtitle="Join the growing number of Ugandan authorities using PTM to build safer, smarter roads."
        primaryCtaText="Get Started"
        primaryCtaHref="/contact"
        secondaryCtaText="Request Demo"
        secondaryCtaHref="/about"
      />

      <Footer />
    </main>
  );
}