/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          750: "#333338",
          850: "#1f1f23",
          925: "#121215",
          950: "#09090b",
        },
      },
    },
  },
  plugins: [],
};
