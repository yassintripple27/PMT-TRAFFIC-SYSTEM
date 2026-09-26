import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PTM Police Traffic Management",
  description: "Police Traffic Management System - AI and IoT traffic management platform for Uganda",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
    >
      <body className="min-h-full bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}