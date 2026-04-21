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
        display: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
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
        },
        bear: {
          DEFAULT: "hsl(var(--bear))",
          foreground: "hsl(var(--bear-foreground))",
        },
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
        slateDark: "#101923",
        sunrise: "#ff6a3d",
        mint: "#27c48f",
        glacier: "#0ea5e9",
      },
      boxShadow: {
        amber: "var(--shadow-amber)",
        cyan: "var(--shadow-cyan)",
        panel: "var(--shadow-panel)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(circle at 20% 20%, rgba(255,106,61,0.2), transparent 42%), radial-gradient(circle at 80% 0%, rgba(39,196,143,0.22), transparent 45%), radial-gradient(circle at 50% 90%, rgba(14,165,233,0.14), transparent 48%)",
        "gradient-amber": "var(--gradient-amber)",
        "gradient-cyan": "var(--gradient-cyan)",
        "gradient-ink": "var(--gradient-ink)",
        "gradient-glass": "var(--gradient-glass)",
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
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "ticker-blip": "ticker-blip 600ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
