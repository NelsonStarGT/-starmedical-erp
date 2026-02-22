import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary, #0A74FF)",
          secondary: "var(--brand-secondary, #2CD3FF)",
          navy: "var(--brand-corporate, #0B1F3A)",
          midnight: "var(--brand-text, #08152A)",
          soft: "var(--brand-soft, #E8F2FF)",
          accent: "var(--brand-accent, #6BE4FF)"
        },
        diagnostics: {
          primary: "var(--diagnostics-primary, #4aa59c)",
          secondary: "var(--diagnostics-secondary, #4aadf5)",
          corporate: "var(--diagnostics-corporate, #2e75ba)",
          background: "var(--diagnostics-background, #f8fafc)"
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
