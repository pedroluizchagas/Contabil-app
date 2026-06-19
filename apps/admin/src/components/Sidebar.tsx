import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'
import { NavItem } from './NavItem'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' as const },
  { href: '/convites', label: 'Convites', icon: 'mail' as const },
  { href: '/tenants', label: 'Tenants', icon: 'building' as const },
  { href: '/planos', label: 'Planos', icon: 'list' as const },
  { href: '/subscriptions', label: 'Subscriptions', icon: 'card' as const },
]

export async function Sidebar() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''
  const iniciais = email.slice(0, 2).toUpperCase() || 'AD'

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          C
        </div>
        <div className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-white">
            ContaHub
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-gray-500">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Gestão do SaaS
        </p>
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* Usuário + logout */}
      <div className="border-t border-sidebar-border px-3 pb-4 pt-3">
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-item text-xs font-semibold text-white">
            {iniciais}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{email || 'Admin'}</p>
            <p className="text-[10px] text-gray-500">Owner</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}
