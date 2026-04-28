/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#E91E8C",
          dark: "#1a1a2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      fontSize: {
        xs:   ["0.8rem",  { lineHeight: "1.4" }],
        sm:   ["0.95rem", { lineHeight: "1.5" }],
        base: ["1.05rem", { lineHeight: "1.6" }],
        lg:   ["1.2rem",  { lineHeight: "1.5" }],
        xl:   ["1.35rem", { lineHeight: "1.4" }],
        "2xl":["1.6rem",  { lineHeight: "1.3" }],
      },
    },
  },
  plugins: [],
};

module.exports = config;