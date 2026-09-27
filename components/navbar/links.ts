export interface NavLink {
  key: string;
  label: string;
  href: string;
  description?: string;
}

export const PRIMARY_NAV_LINKS: NavLink[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "command", label: "Command Center", href: "/command-center" },
  { key: "cameras", label: "Live Feeds", href: "/cameras" },
  { key: "violations", label: "Violations", href: "/violations" },
  { key: "map", label: "Uganda Map", href: "/map" },
  { key: "about", label: "About", href: "/about" },
];

export const MODULE_NAV_LINKS: NavLink[] = [
  { key: "ai", label: "AI Computer Vision", href: "/ai-detection", description: "Real-time vehicle classification and detection" },
  { key: "fines", label: "Fines & Payments", href: "/fines", description: "Automated traffic fine issuance and tracking" },
  { key: "iot", label: "IoT Infrastructure", href: "/iot", description: "Roadside sensor networks and hardware status" },
  { key: "analytics", label: "Traffic Analytics", href: "/analytics", description: "Flow density, velocity charts and reports" },
  { key: "police", label: "Police Desk", href: "/police", description: "Incident management and officer dispatch" },
  { key: "admin", label: "System Admin", href: "/admin", description: "Role permissions and system settings" },
];

export const NAV_LINKS: NavLink[] = [...PRIMARY_NAV_LINKS, ...MODULE_NAV_LINKS];
