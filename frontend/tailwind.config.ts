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
        pink:    "#FF4D6D",
        green:   "#39FF6A",
        amber:   "#F5A623",
        // Dark surface palette
        surface: {
          0:    "#0D0D1A",
          1:    "#12121E",
          2:    "#181826",
          3:    "#1E1E30",
          DEFAULT: "#181826",
        },
        "brut-border": "rgba(255,255,255,0.10)",
        "brut-border-strong": "rgba(255,255,255,0.18)",
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
        brut:         "4px 4px 0 rgba(255,255,255,0.1)",
        "brut-pink":  "0 0 16px rgba(255,77,109,0.45)",
        "brut-green": "0 0 16px rgba(57,255,106,0.35)",
        "brut-amber": "0 0 16px rgba(245,166,35,0.35)",
        "brut-sm":    "2px 2px 0 rgba(255,255,255,0.08)",
        "glass":      "0 4px 24px rgba(0,0,0,0.5)",
        "glass-hover":"0 8px 32px rgba(0,0,0,0.6)",
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
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "pop-in": "pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "slide-right": "slide-right 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
