/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1d2e',
        card: '#222640',
        border: '#2e3254',
        accent: '#6366f1',
        'accent-hover': '#4f52d4',
        positive: '#22c55e',
        negative: '#ef4444',
        muted: '#8b8fa8',
      },
    },
  },
  plugins: [],
}
