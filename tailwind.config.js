/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        medical: {
          50: '#F0F7FF',
          100: '#E8F4FD',
          200: '#B3D9F2',
          300: '#7FBCE6',
          400: '#4A90D9',
          500: '#2E6DB4',
          600: '#1A4F8B',
        },
        abnormal: '#E74C3C',
      },
    },
  },
  plugins: [],
};
