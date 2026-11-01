import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#3563F5', soft: '#E9EFFF' },
        accent: { DEFAULT: '#7952E8', soft: '#F0EBFF' },
        app: '#F7F8FC',
        ink: { DEFAULT: '#182238', muted: '#69758B' },
        line: '#E7EAF2',
        sidebar: '#141B2D',
      },
      borderRadius: { card: '16px', control: '12px' },
      backgroundImage: { 'brand-gradient': 'linear-gradient(115deg, #3563F5 0%, #7952E8 100%)' },
      boxShadow: { card: '0 1px 2px rgba(24,34,56,0.04), 0 4px 16px rgba(24,34,56,0.04)' },
    },
  },
  plugins: [],
} satisfies Config
