import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        slateDark: "#101923",
        sunrise: "#ff6a3d",
        mint: "#27c48f",
        glacier: "#0ea5e9",
      },
      boxShadow: {
        panel: "0 14px 40px rgba(2, 18, 34, 0.22)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(circle at 20% 20%, rgba(255,106,61,0.2), transparent 42%), radial-gradient(circle at 80% 0%, rgba(39,196,143,0.22), transparent 45%), radial-gradient(circle at 50% 90%, rgba(14,165,233,0.14), transparent 48%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

