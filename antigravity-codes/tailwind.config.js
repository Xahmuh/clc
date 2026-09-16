/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark background canvas from your mockup
        canvas: {
          DEFAULT: '#121212',
          dark: '#0A0A0A',
          card: '#FBFBFA',       // The clean soft cream/white card surface
          cardHover: '#F4F4F1',
          cardDark: '#1A1A1A',   // For dark mode nested cards if needed
        },
        brand: {
          primary: '#18181B',    // Deep charcoal/black for primary typography
          accent: '#0066FF',     // Vibrant action blue for key highlights & badges
          muted: '#71717A',      // Secondary text and muted icons
          border: '#E4E4E7',     // Subtle card and divider borders
          success: '#10B981',    // For won deals / positive metrics
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};