import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./contexts/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep violet foundation
        night: {
          DEFAULT: "#0B0713",
          950: "#070510",
          900: "#0B0713",
          800: "#120C1F",
          700: "#1A1229",
          600: "#241A38",
        },
        // Text hierarchy
        ink: {
          DEFAULT: "#F2EFF9",
          dim: "#C9C2DC",
          muted: "#9B92B8",
          faint: "#6E6588",
        },
        // Brand violet
        iris: {
          200: "#DDD2FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        mint: "#4ADE80",
        flame: "#FB923C",
        gold: "#FBBF24",
      },
      maxWidth: {
        app: "480px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(139, 92, 246, 0.35)",
        card: "0 8px 24px rgba(0, 0, 0, 0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.82)", opacity: "0" },
          "60%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.85" },
        },
        flicker: {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)" },
          "50%": { transform: "scale(1.07) rotate(2deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        breathe: "breathe 2.4s ease-in-out infinite",
        flicker: "flicker 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
