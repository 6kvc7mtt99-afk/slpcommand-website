import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        "accent-light": "var(--accent-light)",
        line: "var(--line)",
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        gold: "var(--gold)",
        ok: "var(--ok)",
        bad: "var(--bad)",
        "note-bg": "var(--note-bg)",
        "note-border": "var(--note-border)",
        "skill-reading": "var(--skill-reading)",
        "skill-listening": "var(--skill-listening)",
        "skill-writing": "var(--skill-writing)",
        "skill-speaking": "var(--skill-speaking)",
      },
      borderRadius: {
        card: "var(--radius)",
      },
      maxWidth: {
        legal: "var(--max)",
        hero: "var(--hero-max)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};

export default config;
