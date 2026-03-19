import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',     icon: '⊞' },
  { href: '/tenants',        label: 'Tenants',        icon: '🏢' },
  { href: '/planos',         label: 'Planos',         icon: '📋' },
  { href: '/subscriptions',  label: 'Subscriptions',  icon: '💳' },
]

export async function Sidebar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-gray-100">
      {/* Logo */}
      <div className="flex h-16 flex-col justify-center border-b border-gray-700 px-5">
        <span className="text-base font-bold text-white">ContaHub</span>
        <span className="text-xs text-gray-500">Admin Panel</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* Usuário + logout */}
      <div className="border-t border-gray-700 p-3">
        {user && (
          <p className="mb-2 truncate px-3 text-xs text-gray-500">{user.email}</p>
        )}
        <LogoutButton />
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white mb-0.5"
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </Link>
  )
}
