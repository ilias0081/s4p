/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        text: '#ffffff',
        background: '#100320',
        primary: '#0d00ff',
        secondary: '#b2b2b2',
        accent: '#7700ff'
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        heading: ['Roboto', 'sans-serif']
      },
      fontSize: {
        h1: '4.210rem',
        h2: '3.158rem',
        h3: '2.369rem',
        h4: '1.777rem',
        h5: '1.333rem',
        small: '0.750rem'
      },
      boxShadow: {
        panel: '0 24px 80px rgba(5, 12, 23, 0.32)'
      }
    }
  },
  plugins: []
};