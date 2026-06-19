import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ── Marca ──────────────────────────────────── */
        brand: {
          DEFAULT: '#7DC82E',
          light: '#EBF7D4',
          muted: '#F4FAE9',
          dark: '#5FA01E',
          darker: '#4A7D16',
        },
        /* ── Sidebar ────────────────────────────────── */
        sidebar: '#101214',
        'sidebar-item': '#1C1F26',
        'sidebar-border': '#1E2129',
        'sidebar-next': '#191B22',
        /* ── App ────────────────────────────────────── */
        'app-bg': '#151515',
        surface: '#EFEFEF',
        /* ── Texto (ink) ─────────────────────────────── */
        ink: '#111214',
        'ink-muted': '#6B7280',
        'ink-faint': '#9CA3AF',
        'ink-xfaint': '#C4C9D4',
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        panel: '1.25rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
