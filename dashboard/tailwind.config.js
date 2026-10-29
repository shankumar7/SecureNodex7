/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        snx: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          primary: "#3B82F6",
          accent: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        }
      }
    },
  },
  plugins: [],
};
