import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7DC82E',
          light:   '#EBF7D4',
          muted:   '#F4FAE9',
          dark:    '#5FA01E',
          darker:  '#4A7D16',
        },
        sidebar:        '#101214',
        'sidebar-item': '#1C1F26',
        'app-bg':       '#F2F4F7',
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
