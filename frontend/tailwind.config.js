/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09111f',
        mist: '#d5e6ff',
        ember: '#ff7b54',
        tide: '#52b6ff'
      },
      boxShadow: {
        panel: '0 24px 80px rgba(5, 12, 23, 0.32)'
      }
    }
  },
  plugins: []
};