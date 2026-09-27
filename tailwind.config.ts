import type { Config } from "tailwindcss";

/**
 * Single source of truth lives in `app/globals.css` (CSS custom properties).
 * Every colour, radius, shadow and type step below resolves to a variable so
 * light/dark themes and the console surface all stay in sync with one file.
 */
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
        /* Surfaces */
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        inverse: "var(--inverse)",
        "inverse-text": "var(--inverse-text)",

        /* Lines */
        stroke: "var(--stroke)",
        "stroke-2": "var(--stroke-2)",

        /* Brand + status */
        gold: "var(--gold)",
        "gold-2": "var(--gold-2)",
        "gold-soft": "var(--gold-soft)",
        "gold-line": "var(--gold-line)",
        red: "var(--red)",
        "red-soft": "var(--red-soft)",
        green: "var(--green)",
        "green-soft": "var(--green-soft)",
        blue: "var(--blue)",
        "blue-soft": "var(--blue-soft)",
        amber: "var(--amber)",

        /* Type */
        text: "var(--text)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        hero: ["var(--fs-hero)", { lineHeight: "0.88", letterSpacing: "-0.045em" }],
        display: ["var(--fs-display)", { lineHeight: "0.94", letterSpacing: "-0.038em" }],
        h1: ["var(--fs-h1)", { lineHeight: "1", letterSpacing: "-0.032em" }],
        h2: ["var(--fs-h2)", { lineHeight: "1.08", letterSpacing: "-0.026em" }],
        h3: ["var(--fs-h3)", { lineHeight: "1.25", letterSpacing: "-0.018em" }],
        h4: ["var(--fs-h4)", { lineHeight: "1.3", letterSpacing: "-0.012em" }],
        lead: ["var(--fs-lead)", { lineHeight: "1.6" }],
        body: ["var(--fs-body)", { lineHeight: "1.68" }],
        small: ["var(--fs-small)", { lineHeight: "1.6" }],
        micro: ["var(--fs-micro)", { lineHeight: "1.4" }],
        eyebrow: ["var(--fs-eyebrow)", { lineHeight: "1", letterSpacing: "0.2em" }],
        stat: ["var(--fs-stat)", { lineHeight: "0.9", letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        DEFAULT: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        btn: "var(--r-btn)",
      },
      boxShadow: {
        lift: "var(--shadow-lift)",
        panel: "var(--shadow-panel)",
        overlay: "var(--shadow-overlay)",
      },
      maxWidth: {
        shell: "var(--w-shell)",
        prose: "68ch",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
