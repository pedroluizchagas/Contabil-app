import type { Config } from 'tailwindcss'

// Tokens da marca (cores/fonte/sombras/raios) vêm do pacote compartilhado.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandPreset = require('@contabhub/design-tokens/preset')

export default {
  presets: [brandPreset],
  // Inclui o pacote de componentes para o Tailwind gerar as classes usadas lá.
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui-desktop/src/**/*.{ts,tsx}'],
  plugins: [],
} satisfies Config
