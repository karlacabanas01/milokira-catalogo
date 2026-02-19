// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        milokira: {
          crema: "#F7F4EB",
          lila: "#ECD4FF",
          verde: "#8DA781",
        },
      },
    },
  },
  plugins: [],
};
