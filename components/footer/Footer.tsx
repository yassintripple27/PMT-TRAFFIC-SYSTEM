"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-20 bg-bg/80 backdrop-blur-md border-t border-stroke/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 mb-16">
          <div>
            <div className="brand mb-4">
              <span className="w-6 h-6 rounded-xl bg-gold flex items-center justify-center">
                PTM
              </span>
              <span className="text-text font-bold text-lg tracking-wider">PTM</span>
            </div>
            <p className="text-muted-2 text-sm max-w-sm leading-relaxed">
              Smart Traffic. Safer Roads. Better Uganda. PTM connects AI, IoT, smart cameras and
              police traffic operations into one unified management platform.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-4">Navigation</h5>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/command-center"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Command Center
                </Link>
              </li>
              <li>
                <Link
                  href="/cameras"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Live Cameras
                </Link>
              </li>
              <li>
                <Link
                  href="/violations"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Violations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-4">Resources</h5>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/iot"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  IoT Infrastructure
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Uganda Map
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-4">Company</h5>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/fines"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Fines & Payments
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-2 hover:text-gold transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-stroke/60 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-2 text-sm">
            © {new Date().getFullYear()} PTM — Police Traffic Management System
          </p>
          <div className="flex gap-3">
            <a
              href="#"
              className="text-muted-2 hover:text-gold transition-colors"
              aria-label="Twitter"
            >
              <svg 
                viewBox="0 0 24 24" 
                width={20} 
                height={20} 
                fill="currentColor"
              >
                <path d="M18.244 5.253a9.79 9.79 0 0 1-6.678 2.061 9.58 9.58 0 1 0 .395 3.057C9.409 17.358 5.374 14.957 3.992 11.682a9.796 9.796 0 0 1 2.04-6.068q.047-.247.087-.494l.833-.682a6.778 6.778 0 0 1 2.39 1.13 6.721 6.721 0 0 1-1.148 2.411z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-2 hover:text-gold transition-colors"
              aria-label="LinkedIn"
            >
              <svg 
                viewBox="0 0 24 24" 
                width={20} 
                height={20} 
                fill="currentColor"
              >
                <path d="M20.447 6.312c-.296-1.017-1.059-1.685-2.057-1.685-2.173 0-2.686.833-2.686 1.849 0 1.015.538 1.752 1.553 2.086l3.108 2.105a5.611 5.611 0 0 0 1.022 1.228 5.585 5.585 0 0 0 1.08-2.057l-2.238-3.099a5.585 5.585 0 0 0-2.138-.866zm-6.847 7.175a3.07 3.07 0 1 1-2.132-1.817 3.09 3.09 0 0 1 2.13 1.817zm7.473-.617a3.075 3.075 0 1 1-2.13 1.817 3.065 3.065 0 0 1 2.13-1.817zm-5.427-4.898a3.067 3.067 0 1 1-2.13 1.817 3.064 3.064 0 0 1 2.13-1.817zm7.473 5.263a3.067 3.067 0 1 1-2.13 1.817 3.065 3.065 0 0 1 2.13-1.817z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-2 hover:text-gold transition-colors"
              aria-label="YouTube"
            >
              <svg 
                viewBox="0 0 24 24" 
                width={20} 
                height={20} 
                fill="currentColor"
              >
                <path d="M2.07 6.24a2.72 2.72 0 0 1 2.1-.88h3.77a2.72 2.72 0 0 1 2.1.88l2.28 3.55a2.74 2.74 0 0 1-.4 2.11l-2.22.7a2.88 2.88 0 0 1-2.05-.65l-2.23-3.53a2.74 2.74 0 0 1-.4-2.11l2.22-3.55zM7.9 4h.1a2.72 2.72 0 0 1 2.7 2.7h8.3a2.72 2.72 0 0 1 2.7 2.7.7.7 0 0 1-.01 1.1H10.6a2.72 2.72 0 0 1-2.69-.5H7.9a2.72 2.72 0 0 1-2.7-2.7H5.66a2.72 2.72 0 0 1-.01-1.1H2.9a2.72 2.72 0 0 1-.7-2.7zM4.9 14.2a2.72 2.72 0 0 1 2.69-.5h4.43a2.72 2.72 0 0 1 .01 1.1h.1a2.72 2.72 0 0 1 2.7 2.7h8.3a2.72 2.72 0 0 1 2.7 2.7.7.7 0 0 1-.01 1.1h-.1a2.72 2.72 0 0 1-2.7-2.7H10.6a2.72 2.72 0 0 1-2.69-.5H4.9a2.72 2.72 0 0 1-2.7-2.7z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}