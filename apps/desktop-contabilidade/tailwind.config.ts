import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#7ED321',
          dark: '#5CA618',
          muted: 'rgba(126,211,33,0.12)',
        },
        sidebar: {
          bg: '#151515',
          item: '#555555',
          'item-hover': '#888888',
          'item-active': '#7ED321',
          section: '#383838',
          border: '#1e1e1e',
          search: '#1f1f1f',
          next: '#1c1c1c',
        },
        surface: '#EFEFEF',
        card: '#FFFFFF',
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#999999',
          faint: '#bbbbbb',
          xfaint: '#cccccc',
        },
        danger: '#E84444',
      },
      borderRadius: {
        card: '14px',
        panel: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        topbar: '0 1px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
