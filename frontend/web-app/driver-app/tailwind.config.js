/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10B981',   // Green (driver theme)
        secondary: '#3B82F6', // Blue
        danger: '#EF4444',
        dark: '#1F2937',
        accent: '#F59E0B',    // Amber for earnings
      },
      boxShadow: {
        'bottom-sheet': '0 -4px 20px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
