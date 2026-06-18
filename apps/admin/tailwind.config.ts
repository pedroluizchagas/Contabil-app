import type { Config } from 'tailwindcss'

// Tokens da marca compartilhados (disponibiliza `brand`, `ink`, etc.). O
// re-tema completo do admin (accent) é a Fase D4.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandPreset = require('@contabhub/design-tokens/preset')

export default {
  presets: [brandPreset],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  plugins: [],
} satisfies Config
