import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Escala da marca (verde ContaHub — #7DC82E)
        brand: {
          DEFAULT: '#7DC82E',
          50:  '#F4FAE9',
          100: '#EBF7D4',
          200: '#D6EFA8',
          300: '#B0DE70',
          400: '#94D348',
          500: '#7DC82E',
          600: '#6CB025',
          700: '#4A7D16',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
