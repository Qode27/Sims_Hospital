/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#dbeafe",
          500: "#1d4ed8",
          600: "#1e40af",
          700: "#1d2f6f",
        },
        slateblue: "#355c7d",
        ivory: "#f9f7f2",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(30, 64, 175, 0.08)",
      },
    },
  },
  plugins: [],
};
