/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          750: '#1e293b',
          850: '#0f172a',
          950: '#020617',
        }
      }
    },
  },
  plugins: [],
}
