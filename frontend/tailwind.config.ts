import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#0b0e0c", raised: "#121714", panel: "#121714" },
        oracle: { DEFAULT: "#c9a227", glow: "#e8c44d" },
        hit: "#3fb950", miss: "#f85149", pending: "#8b949e",
        ink: { DEFAULT: "#e6efe9", dim: "#8fa399" },
      },
      fontFamily: { display: ["Fraunces", "serif"], mono: ["IBM Plex Mono", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
