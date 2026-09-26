"use client";

import { useState } from "react";
import { ServiceCard } from "@/components/services/ServiceCard";

export interface Service {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon?: string;
  image?: string;
}

export function Services({ services }: { services: Service[] }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="py-24 bg-bg/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="eyebrow mb-3">System Purpose</span>
          <h2 className="h1 display font-extrabold tracking-tighter">
            One platform for the whole <span className="text-gold">traffic lifecycle</span>
          </h2>
          <p className="lead text-muted max-w-2xl mx-auto">
            PTM monitors roads through smart cameras and IoT devices, detects vehicles and motorcycles,
            reads number plates, identifies configured violations, secures evidence, manages penalties and
            gives authorised officers real-time access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services
            .slice(0, showMore ? services.length : 6)
            .map((service) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                description={service.description}
                href={service.href}
                icon={service.icon}
                image={service.image}
              />
            ))}

          {services.length > 6 && (
            <div className="col-span-full mt-8 text-center">
              <button
                onClick={() => setShowMore(true)}
                className="btn btn-gold w-full py-3 rounded-xl text-center"
              >
                View all services
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}