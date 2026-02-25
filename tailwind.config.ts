import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"]
      },
      colors: {
        brand: {
          primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--color-accent-rgb) / <alpha-value>)",
          corporate: "rgb(var(--color-structure-rgb) / <alpha-value>)",
          navy: "rgb(var(--text-rgb) / <alpha-value>)",
          midnight: "rgb(var(--color-structure-rgb) / <alpha-value>)",
          soft: "rgb(var(--bg-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-accent-rgb) / <alpha-value>)"
        },
        app: {
          bg: "rgb(var(--bg-rgb) / <alpha-value>)",
          surface: "rgb(var(--surface-rgb) / <alpha-value>)",
          text: "rgb(var(--text-rgb) / <alpha-value>)",
          border: "rgb(var(--border-rgb) / <alpha-value>)"
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
