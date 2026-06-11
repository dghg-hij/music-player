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
        // PRD 2.3 颜色规范 - 深色主题
        "bg-dark": "#0a0a0a",
        "card-dark": "#1a1a1a",
        "accent-dark": "#8b5cf6",
        "accent2-dark": "#06b6d4",
        // PRD 2.3 颜色规范 - 浅色主题
        "bg-light": "#f5f5f5",
        "card-light": "#ffffff",
        "accent-light": "#7c3aed",
        "accent2-light": "#0891b2",
        // 通用色
        "ink-dark": "#e5e5e5",
        "ink-soft-dark": "#888888",
        "ink-light": "#1a1a1a",
        "ink-soft-light": "#666666",
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
        serif: ["Noto Serif SC", "serif"],
      },
      fontSize: {
        // PRD 2.4 字体规范
        "title-lg": ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        "title-sm": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.5", fontWeight: "400" }],
        "mono": ["11px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        // PRD 2.5 间距规范
        "sp-xs": "4px",
        "sp-sm": "8px",
        "sp-md": "12px",
        "sp-lg": "16px",
        "sp-xl": "24px",
        "sp-2xl": "32px",
      },
      borderRadius: {
        // PRD 组件规范圆角
        "btn-pill": "18px",
        "btn-secondary": "16px",
        "btn-icon": "16px",
        "card": "24px",
        "cover": "8px",
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
        "card-soft": "0 2px 12px rgba(124, 58, 237, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(124, 58, 237, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
