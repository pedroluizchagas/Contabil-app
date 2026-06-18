import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/* ── SVG icons (mesma linguagem visual do app da contabilidade) ──── */
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M10 1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6l-5-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 1v5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 10h6M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 15c0-2.5 2-4 4.5-4S11 12.5 11 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 4.5a2.5 2.5 0 0 1 0 5M13 15c0-2-1-3.4-2.5-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.5v1.2M9 15.3v1.2M1.5 9h1.2M15.3 9h1.2M3.7 3.7l.85.85M13.45 13.45l.85.85M3.7 14.3l.85-.85M13.45 4.55l.85-.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path
        d="M6 14.5H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 11.5L14.5 8.5L11.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.5 8.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconGrid },
  { to: '/documentos', label: 'Documentos', Icon: IconFile },
  { to: '/funcionarios', label: 'Funcionários', Icon: IconUsers },
  { to: '/conta', label: 'Minha Conta', Icon: IconSettings },
]

export function Sidebar() {
  const { logout, empresa } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const nomeEmpresa = empresa?.nome ?? 'Empresa'
  const iniciais = nomeEmpresa.slice(0, 2).toUpperCase()

  return (
    <aside className="flex h-screen w-60 flex-col" style={{ background: '#101214' }}>
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: '#7DC82E' }}
        >
          C
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">ContaHub</span>
      </div>

      {/* ── Navegação ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Menu
        </p>

        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
              ].join(' ')
            }
            style={({ isActive }) => (isActive ? { background: '#7DC82E' } : {})}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Rodapé ───────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border px-3 pb-4 pt-3">
        {/* Empresa info */}
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: '#2A2D35' }}
          >
            {iniciais}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{nomeEmpresa}</p>
            <p className="text-[10px] text-gray-500">Empresa</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          <IconLogout />
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
