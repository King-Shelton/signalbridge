import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        mist: "#eff5f3",
        pine: "#1f6f64",
        coral: "#d95f48",
        amber: "#b7791f"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24, 33, 47, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
