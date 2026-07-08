/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        skanda: {
          bg:       '#06050d',
          surface:  '#0e0c1a',
          border:   '#1e1b2e',
          gold:     '#c8922a',
          'gold-lt':'#e0a93a',
          muted:    '#4a4560',
          text:     '#e8e4f0',
          dim:      '#7a7490',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        sans:   ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease forwards',
        'slide-up':  'slideUp 0.4s ease forwards',
        'pulse-gold':'pulseGold 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 0 0 rgba(200,146,42,0.4)' }, '50%': { boxShadow: '0 0 0 12px rgba(200,146,42,0)' } },
      },
    },
  },
  plugins: [],
}
