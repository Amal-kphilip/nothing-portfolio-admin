/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- ADD THIS LINE (Must be here to make toggle work)
  theme: {
    extend: {
      colors: {
        'nothing-red': '#D71921',
        'nothing-black': '#000000',
        'nothing-white': '#FFFFFF',
        'nothing-grey': '#808080',
        'nothing-light-grey': '#E5E5E5',
        'nothing-dark-grey': '#1A1A1A',
      },
      fontFamily: {
        dot: ['Ndot55', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}