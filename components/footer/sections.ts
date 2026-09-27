export interface FooterSection {
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Platform",
    links: [
      { label: "Command Center", href: "/command-center" },
      { label: "Live Cameras", href: "/cameras" },
      { label: "AI Detection", href: "/ai-detection" },
    ],
  },
  {
    title: "Operations",
    links: [
      { label: "Violations Desk", href: "/violations" },
      { label: "Fines & Payments", href: "/fines" },
      { label: "Police Dispatch", href: "/police" },
    ],
  },
  {
    title: "Insights",
    links: [
      { label: "Uganda Live Map", href: "/map" },
      { label: "IoT Infrastructure", href: "/iot" },
      { label: "Traffic Analytics", href: "/analytics" },
    ],
  },
  {
    title: "Governance",
    links: [
      { label: "System Admin", href: "/admin" },
      { label: "About System", href: "/about" },
      { label: "Main Overview", href: "/" },
    ],
  },
];
