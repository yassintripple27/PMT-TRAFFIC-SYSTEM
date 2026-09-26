import { About } from "@/components/about/About";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";

export default function AboutPage() {
  const aboutStats = [
    { label: "Years Experience", value: "10+", prefix: "" },
    { label: "Countries Served", value: "50+", prefix: "" },
    { label: "Projects Completed", value: "1,000+", prefix: "" },
    { label: "Support Available", value: "24/7", prefix: "" },
  ];

  return (
    <main className="flex flex-col min-h-screen">
      <Navbar />
      <section className="py-24 relative bg-bg/50" data-about-section>
        <div className="max-w-7xl mx-auto px-6">
          <About
            label="About PTM"
            heading="Police Traffic Management System"
            paragraph="PTM is an AI and IoT traffic management platform for Uganda: smart cameras, automatic number plate recognition, violation detection, evidence management and real-time police operations. Our platform combines cutting-edge technology with practical enforcement to create safer roads across the nation."
            stats={aboutStats}
            ctaText="View Capabilities"
            ctaHref="/fines"
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}