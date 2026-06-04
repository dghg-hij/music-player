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
        bg: "#0D0D0D",
        card: "#1A1A2E",
        accent: "#A855F7",
        "accent-orange": "#F97316",
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
      },
      animation: {
        "wave-1": "wave 1.2s ease-in-out infinite",
        "wave-2": "wave 1.2s ease-in-out 0.2s infinite",
        "wave-3": "wave 1.2s ease-in-out 0.4s infinite",
        "wave-4": "wave 1.2s ease-in-out 0.6s infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        ripple: "ripple 0.6s ease-out",
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
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
