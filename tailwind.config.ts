import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0A74FF",
          secondary: "#2CD3FF",
          navy: "#0B1F3A",
          midnight: "#08152A",
          soft: "#E8F2FF",
          accent: "#6BE4FF"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.08)",
        lifted: "0 10px 30px rgba(0, 0, 0, 0.12)"
      },
      borderRadius: {
        xl: "18px"
      }
    }
  },
  plugins: []
};

export default config;
