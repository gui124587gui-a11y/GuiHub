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
        background: "#000000",
        card: "#0A0A0A",
        cardHover: "#171717",
        primary: "#FF0000",
        secondary: "#B00000",
        textPrimary: "#FFFFFF",
        textSecondary: "#A3A3A3",
        success: "#FF0000",
        warning: "#FF0000",
        error: "#FF0000"
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px"
      }
    },
  },
  plugins: [],
};
