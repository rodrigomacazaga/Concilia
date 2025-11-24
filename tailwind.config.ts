import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'claude-beige': '#f5f3ef',
        'claude-orange': '#f97316',
        'claude-border': '#e5e2dd',
      },
    },
  },
  plugins: [],
};
export default config;
