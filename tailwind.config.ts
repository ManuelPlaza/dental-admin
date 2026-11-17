import type { Config } from "tailwindcss";

// Tokens del panel: mismos colores de marca que la landing (azul marino + turquesa),
// pero sobre un fondo claro. Los valores viven en globals.css como canales RGB
// para que funcionen con opacidad (`bg-ink/10`, `text-accent/80`).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        ink:     token("ink"),
        page:    token("page"),
        surface: token("surface"),
        line:    token("line"),
        navy:    token("navy"),
        gold:    token("gold"),
        accent: {
          DEFAULT: token("accent"),
          strong:  token("accent-strong"),
          soft:    token("accent-soft"),
        },
        // En fondo claro, los tonos 300/400 pensados para fondo oscuro no
        // alcanzan contraste AA como texto. Se oscurecen aquí una sola vez
        // para todas las pantallas.
        cyan:   { 100: "#CFFAFE", 300: "#0E7490", 400: "#0E7490", 500: "#0E7490" },
        red:    { 200: "#991B1B", 300: "#B91C1C", 400: "#B91C1C", 500: "#DC2626" },
        green:  { 300: "#15803D", 400: "#15803D", 500: "#16A34A" },
        emerald:{ 300: "#047857", 400: "#047857", 500: "#059669" },
        amber:  { 200: "#92400E", 300: "#B45309", 400: "#B45309", 500: "#D97706" },
        orange: { 400: "#C2410C", 500: "#EA580C" },
        yellow: { 400: "#A16207", 500: "#CA8A04" },
        blue:   { 300: "#1D4ED8", 400: "#1D4ED8", 500: "#2563EB" },
        purple: { 400: "#334155" },
        violet: { 300: "#334155", 400: "#334155", 500: "#475569" },
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
        pop:  "0 12px 32px rgb(15 23 42 / 0.12), 0 2px 6px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
