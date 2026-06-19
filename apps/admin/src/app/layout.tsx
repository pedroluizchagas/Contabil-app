import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContaHub Admin',
  description: 'Painel de administração do SaaS ContaHub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-app-bg font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
