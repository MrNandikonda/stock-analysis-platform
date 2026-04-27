import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1600px" },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', '"Outfit"', "system-ui", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-elevated": "hsl(var(--background-elevated))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        bull: {
          DEFAULT: "hsl(var(--bull))",
          foreground: "hsl(var(--bull-foreground))",
          soft: "hsl(var(--bull-soft))",
        },
        bear: {
          DEFAULT: "hsl(var(--bear))",
          foreground: "hsl(var(--bear-foreground))",
          soft: "hsl(var(--bear-soft))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          soft: "hsl(var(--warn-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          soft: "hsl(var(--info-soft))",
        },
        "desk-navy": "hsl(var(--desk-navy))",
        neutral: "hsl(var(--neutral))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "surface-sunken": "hsl(var(--surface-sunken))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        slateDark: "#050505",
        aqua: "#00f0ff",
        violet: "#8b5cf6",
        fuchsia: "#d946ef",
        rose: "#f43f5e",
        emerald: "#10b981",
        amber: "#f59e0b",
      },
      boxShadow: {
        amber: "var(--shadow-amber)",
        cyan: "var(--shadow-cyan)",
        panel: "var(--shadow-panel)",
        "premium-glow": "0 0 30px -5px rgba(139, 92, 246, 0.25)",
        "premium-card": "0 8px 30px 0 rgba(100, 110, 140, 0.15)",
      },
      backgroundImage: {
        "mesh-gradient": "radial-gradient(circle at 20% 20%, rgba(139,92,246,0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(217,70,239,0.08), transparent 40%), radial-gradient(circle at 50% 90%, rgba(0,240,255,0.05), transparent 50%)",
        "gradient-amber": "var(--gradient-amber)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-cyan": "var(--gradient-cyan)",
        "gradient-ink": "var(--gradient-ink)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-premium": "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        "ticker-blip": {
          "0%": { backgroundColor: "hsl(var(--primary) / 0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        }
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "ticker-blip": "ticker-blip 600ms ease-out",
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "fade-in": "fade-in 350ms ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
