/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#e1e9f3',
          200: '#c3d3e7',
          300: '#95b3d6',
          400: '#618dc1',
          500: '#3d6ea8',
          600: '#2b548b',
          700: '#224370',
          800: '#1c375c',
          900: '#0f243f',
          950: '#091526', // Deep Islamic Midnight Navy
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d4ed8', // Royal Blue
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        gold: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        arabic: ['Amiri', 'Traditional Arabic', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(15, 36, 63, 0.08), 0 4px 6px -2px rgba(15, 36, 63, 0.04)',
        'card': '0 4px 20px -2px rgba(15, 36, 63, 0.06), 0 2px 6px -1px rgba(15, 36, 63, 0.04)',
        'modal': '0 20px 25px -5px rgba(9, 21, 38, 0.3), 0 10px 10px -5px rgba(9, 21, 38, 0.2)',
      }
    },
  },
  plugins: [],
}
