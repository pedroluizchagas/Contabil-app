import type { Config } from 'tailwindcss'

// Tokens da marca compartilhados (verde #7DC82E, ink, sidebar, DM Sans).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandPreset = require('@contabhub/design-tokens/preset')

export default {
  presets: [brandPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui-desktop/src/**/*.{ts,tsx}'],
  plugins: [],
} satisfies Config
