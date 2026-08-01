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
        background: "#020617",
        card: "#071A2F",
        cardHover: "#102A48",
        primary: "#3B82F6",
        secondary: "#2563EB",
        textPrimary: "#F8FAFC",
        textSecondary: "#94A3B8",
        success: "#10B981",
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
