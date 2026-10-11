/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        offwhite: {
          DEFAULT: '#f4f4f6',
          50: '#fafafa',
          100: '#f4f4f6',
          200: '#e8e8ea',
          300: '#dadadb',
          400: '#a1a1aa'
        },
        carbon: {
          950: '#050507',
          900: '#09090b',
          850: '#111114',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#e4e4e7',
          100: '#f4f4f5'
        }
      }
    },
  },
  plugins: [],
}
