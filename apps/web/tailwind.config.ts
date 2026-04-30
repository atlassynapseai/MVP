import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7C3AED",
          light: "#A78BFA",
          dark: "#5B21B6",
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "scale-in": "scaleIn 0.3s ease-out both",
        "slide-left": "slideInLeft 0.35s ease-out both",
        "slide-right": "slideInRight 0.35s ease-out both",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 3.5s ease-in-out infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite",
        "gradient": "gradientShift 4s ease infinite",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-18px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(18px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(124,58,237,0.25)" },
          "50%": { boxShadow: "0 0 22px rgba(124,58,237,0.65), 0 0 45px rgba(124,58,237,0.25)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-4px) rotate(1deg)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(124,58,237,0.2)" },
          "50%": { borderColor: "rgba(124,58,237,0.7)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
