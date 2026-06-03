import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brutalist accent palette (unchanged)
        pink:   "#e8533a",
        green:  "#2a7d4f",
        amber:  "#c47c2b",
        // Dark surface palette
        surface: {
          0: "#f5f0e8",
          1: "rgba(255,255,255,0.90)",
          2: "rgba(255,255,255,0.85)",
          3: "rgba(255,255,255,0.75)",
          DEFAULT: "rgba(255,255,255,0.85)",
        },
        "brut-border": "rgba(28,31,58,0.10)",
        "brut-border-strong": "rgba(28,31,58,0.18)",
        // Paper / stationery palette
        paper: "#f5f0e8",
        ink:   "#1c1f3a",
        desk:  "#e8e3d9",
        rule:  "#d4cfc4",
      },
      borderRadius: {
        lg: "0rem",
        md: "0rem",
        sm: "0rem",
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        brut:         "4px 4px 0 rgba(28,31,58,0.18)",
        "brut-red":   "0 0 16px rgba(232,83,58,0.35)",
        "brut-green": "0 0 16px rgba(42,125,79,0.25)",
        "brut-amber": "0 0 16px rgba(196,124,43,0.25)",
        "brut-sm":    "2px 2px 0 rgba(28,31,58,0.12)",
        "glass":      "0 4px 24px rgba(28,31,58,0.12)",
        "glass-hover":"0 8px 32px rgba(28,31,58,0.18)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(20px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "lid-open":   { from: { transform: "rotateX(0deg)" },    to: { transform: "rotateX(-110deg)" } },
        "lid-close":  { from: { transform: "rotateX(-110deg)" }, to: { transform: "rotateX(0deg)" } },
        "tool-rise":  { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "sticky-drop": {
          from: { transform: "translateY(-20px) rotate(var(--r, -2deg))", opacity: "0" },
          to:   { transform: "translateY(0) rotate(var(--r, -2deg))",     opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "pop-in": "pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "slide-right": "slide-right 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "lid-open":    "lid-open 0.35s var(--spring) forwards",
        "lid-close":   "lid-close 0.28s ease-in forwards",
        "tool-rise":   "tool-rise 0.3s var(--spring) forwards",
        "sticky-drop": "sticky-drop 0.4s var(--spring) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
