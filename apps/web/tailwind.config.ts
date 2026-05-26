import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#FFFFFF",
          muted: "#F8FAFC",
          soft: "#F1F5F9"
        },
        primary: {
          500: "#2563EB",
          400: "#3B82F6",
          300: "#60A5FA"
        },
        accent: {
          500: "#EAB308",
          400: "#FACC15",
          100: "#FEF9C3"
        },
        content: {
          strong: "#0F172A",
          default: "#334155",
          muted: "#64748B"
        },
        brand: {
          500: "#4f46e5",
          600: "#4338ca"
        }
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 23, 42, 0.08)",
        panelHover: "0 18px 45px rgba(37, 99, 235, 0.14)"
      }
    }
  },
  plugins: []
} satisfies Config;
