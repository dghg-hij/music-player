/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 夜间模式默认色
        bg: "#0D0D0D",
        card: "#1A1A2E",
        accent: "#A855F7",
        "accent-orange": "#F97316",
        // 日间模式色
        "bg-day": "#FAF7F2",
        "card-day": "#FFFFFF",
        "ink-day": "#1F2937",
        "ink-soft-day": "#6B7280",
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
        serif: ["Noto Serif SC", "serif"],
      },
      animation: {
        "wave-1": "wave 1.2s ease-in-out infinite",
        "wave-2": "wave 1.2s ease-in-out 0.2s infinite",
        "wave-3": "wave 1.2s ease-in-out 0.4s infinite",
        "wave-4": "wave 1.2s ease-in-out 0.6s infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        ripple: "ripple 0.6s ease-out",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { height: "4px" },
          "50%": { height: "16px" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      boxShadow: {
        glow: "0 0 0 2px var(--tw-shadow-color)",
        "clickable": "0 0 0 1px currentColor",
      },
    },
  },
  plugins: [],
};
