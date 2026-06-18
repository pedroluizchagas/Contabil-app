import type { Config } from 'tailwindcss'

// Tokens da marca compartilhados — NativeWind lê o mesmo preset, unificando a
// identidade do mobile com os apps desktop (verde #7DC82E etc.).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandPreset = require('@contabhub/design-tokens/preset')

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), brandPreset],
  plugins: [],
} satisfies Config
