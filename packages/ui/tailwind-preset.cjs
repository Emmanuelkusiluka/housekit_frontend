/**
 * Shared Tailwind preset — the Housekit design tokens.
 * Status colors are a product feature (§10) and map 1:1 to charge/unit/lease
 * statuses. Apps extend this preset and point `content` at their own src.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand — a confident deep indigo (distinct from every status color).
        brand: {
          50: "#eef1ff",
          100: "#e0e5ff",
          200: "#c6cdff",
          300: "#a3abfc",
          400: "#7f83f8",
          500: "#635bef",
          600: "#4f46e5",
          700: "#4239c4",
          800: "#37319e",
          900: "#302d7d",
        },
        // Semantic status colors (§10).
        paid: { DEFAULT: "#059669", fg: "#065f46", bg: "#ecfdf5" },
        overdue: { DEFAULT: "#dc2626", fg: "#991b1b", bg: "#fef2f2" },
        partial: { DEFAULT: "#d97706", fg: "#92400e", bg: "#fffbeb" },
        vacant: { DEFAULT: "#6b7280", fg: "#374151", bg: "#f9fafb" },
        maintenance: { DEFAULT: "#475569", fg: "#334155", bg: "#f1f5f9" },
        surface: "#ffffff",
        canvas: "#f7f8fa",
        ink: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          subtle: "#9ca3af",
        },
        line: "#e5e7eb",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Ubuntu",
          "Cantarell",
          "Noto Sans",
          "sans-serif",
        ],
        display: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        pop: "0 10px 30px rgba(16,24,40,0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 180ms ease-out",
        "slide-in-right": "slide-in-right 220ms ease-out",
      },
    },
  },
  plugins: [],
};
