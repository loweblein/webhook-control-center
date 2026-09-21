import forms from "@tailwindcss/forms";
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#111827",
        panel: "#ffffff",
        line: "#d9e2ea",
        accent: "#047857",
        "dark-panel": "#101826",
        "dark-line": "#253044"
      },
      boxShadow: {
        soft: "0 18px 50px rgb(15 23 42 / 0.08)",
        "soft-dark": "0 18px 50px rgb(0 0 0 / 0.24)"
      }
    }
  },
  plugins: [forms]
} satisfies Config;
