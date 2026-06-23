import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        pine: {
          300: "#6fb8aa",
          400: "#3d9484",
          500: "#1f6f64",
          600: "#1a5d54",
          700: "#164b44",
          800: "#123c36",
        },
        coral: {
          300: "#e88d78",
          400: "#df725a",
          500: "#d95f48",
          600: "#c14b36",
        },
        amber: {
          200: "#e9c685",
          300: "#d6a64c",
          400: "#c48f2c",
          500: "#b7791f",
          600: "#9a6318",
        },
        ink: "#18212f",
        mist: "#eff5f3",
        canvas: "#f8fbfa",
        // Dark surfaces
        dark: {
          base: "#060d0c",
          card: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.1)",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24,33,47,0.12)",
        glow: "0 0 26px 7px rgba(111,184,170,0.3)",
        "pine-lg": "0 12px 30px rgba(31,111,100,0.35)",
        "coral-lg": "0 12px 30px rgba(217,95,72,0.3)",
      },
      animation: {
        "rise": "sb-rise 0.8s cubic-bezier(0.2,0,0,1) forwards",
        "soft": "sb-soft 0.7s ease forwards",
        "pop": "sb-pop 0.5s cubic-bezier(0.2,0,0,1) forwards",
        "dot": "sb-dot 1.3s ease-in-out infinite",
        "core": "sb-core 2.8s ease-in-out infinite",
        "ring": "sb-ring 3.4s ease-out infinite",
        "drift1": "sb-drift1 24s ease-in-out infinite",
        "drift2": "sb-drift2 28s ease-in-out infinite",
        "scan": "sb-scan 14s linear infinite",
      }
    }
  },
  plugins: []
};

export default config;
