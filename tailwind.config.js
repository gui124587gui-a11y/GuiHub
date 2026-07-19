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
        background: "#0B1220",
        card: "#111827",
        cardHover: "#1F2937",
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        textPrimary: "#FFFFFF",
        textSecondary: "#9CA3AF",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444"
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px"
      }
    },
  },
  plugins: [],
};
