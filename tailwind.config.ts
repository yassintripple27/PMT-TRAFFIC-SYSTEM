import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", "selector"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#05060a",
        "bg-2": "#0a0c12",
        "bg-3": "#0f1219",
        panel: "rgba(255, 255, 255, 0.045)",
        "panel-2": "rgba(255, 255, 255, 0.075)",
        stroke: "rgba(255, 255, 255, 0.1)",
        "stroke-2": "rgba(255, 255, 255, 0.18)",
        gold: "#ffc93c",
        "gold-2": "#f0a92c",
        "gold-soft": "rgba(255, 201, 60, 0.14)",
        "gold-line": "rgba(255, 201, 60, 0.32)",
        red: "#ff4d4d",
        "red-soft": "rgba(255, 77, 77, 0.14)",
        green: "#24d17d",
        "green-soft": "rgba(36, 209, 125, 0.14)",
        blue: "#3ba7ff",
        "blue-soft": "rgba(59, 167, 255, 0.14)",
        amber: "#ffb020",
        text: "#ffffff",
        muted: "#9aa4b4",
        "muted-2": "#6b7484",
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "26px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;