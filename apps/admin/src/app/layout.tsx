import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContaHub Admin',
  description: 'Painel de administração do SaaS ContaHub',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
