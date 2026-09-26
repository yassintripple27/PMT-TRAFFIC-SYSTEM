"use client";

import Image from "next/image";
import Link from "next/link";

export interface ServiceCardProps {
  icon?: string;
  title: string;
  description: string;
  href?: string;
  image?: string;
}

export function ServiceCard({ 
  icon, 
  title, 
  description, 
  href,
  image 
}: ServiceCardProps) {
  return (
    <div 
      className="feature-card group rounded-2xl border border-stroke/50 bg-panel transition-all hover:border-gold-line hover:-translate-y-1 hover:shadow-xl group-hover:shadow-2xl"
    >
      {image && (
        <div className="feature-card-image aspect-[4/3] overflow-hidden rounded-t-2xl group-hover:opacity-90">
          <Image
            src={image}
            alt={title}
            width={400}
            height={300}
            className="object-cover w-full h-full transition-opacity duration-300 group-hover:opacity-90"
          />
        </div>
      )}

      <div className="p-6">
        <div className="feature-icon mb-4">
          <svg 
            viewBox="0 0 24 24" 
            width={24} 
            height={24} 
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d={icon} />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-text mb-2 line-clamp-2">
          {title}
        </h3>

        <p className="text-muted-2 line-clamp-3 text-sm">
          {description}
        </p>
      </div>

      {href && (
        <div className="pt-2">
          <Link
            href={href}
            className="text-gold-line text-sm font-medium hover:underline group/hover:underline"
          >
            Learn more
          </Link>
        </div>
      )}
    </div>
  );
}