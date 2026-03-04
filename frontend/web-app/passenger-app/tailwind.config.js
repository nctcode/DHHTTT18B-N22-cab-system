/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',   // Blue
        secondary: '#10B981', // Green
        danger: '#EF4444',    // Red
        dark: '#1F2937',
      },
      boxShadow: {
        'bottom-sheet': '0 -4px 20px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
