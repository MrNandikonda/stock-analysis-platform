/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        background:   "hsl(var(--background))",
        foreground:   "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border:       "hsl(var(--border))",
        input:        "hsl(var(--input))",
        ring:         "hsl(var(--ring))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Signal palette
        bull: {
          DEFAULT: "hsl(var(--bull))",
          soft:    "hsl(var(--bull-soft))",
        },
        bear: {
          DEFAULT: "hsl(var(--bear))",
          soft:    "hsl(var(--bear-soft))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          soft:    "hsl(var(--warn-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          soft:    "hsl(var(--info-soft))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card:     "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      backgroundImage: {
        "hero":   "var(--gradient-hero)",
        "accent": "var(--gradient-accent)",
      },
      letterSpacing: {
        display: "-0.01em",
      },
    },
  },
  plugins: [],
};
