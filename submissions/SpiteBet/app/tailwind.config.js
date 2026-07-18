/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neo-bg': '#f4f4f0',
        'neo-green': '#a3e635', // lime-400
        'neo-red': '#f87171', // red-400
        'neo-yellow': '#fde047', // yellow-300
        'neo-blue': '#60a5fa', // blue-400
        'neo-dark': '#1c1917', // stone-900
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(28, 25, 23, 1)',
        'neo-lg': '8px 8px 0px 0px rgba(28, 25, 23, 1)',
        'neo-sm': '2px 2px 0px 0px rgba(28, 25, 23, 1)',
      }
    },
  },
  plugins: [],
}
