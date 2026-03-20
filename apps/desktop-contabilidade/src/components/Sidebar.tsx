import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/* ── SVG icons ──────────────────────────────────────────────────── */
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
function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 16V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 8h2M10 8h2M6 11.5h2M10 11.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 16v-3h4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 12V3M5 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M10 1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6l-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 1v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10h6M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M6 14.5H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 11.5L14.5 8.5L11.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 8.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── Nav items ──────────────────────────────────────────────────── */
const navItems = [
  { to: '/dashboard',    label: 'Dashboard',   Icon: IconGrid },
  { to: '/empresas',     label: 'Empresas',    Icon: IconBuilding },
  { to: '/lotes/upload', label: 'Enviar Lote', Icon: IconUpload },
  { to: '/documentos',   label: 'Documentos',  Icon: IconFile },
]

/* ── Component ──────────────────────────────────────────────────── */
export function Sidebar() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const email = user?.email ?? ''
  const iniciais = email.slice(0, 2).toUpperCase()

  return (
    <aside
      className="flex h-screen w-60 flex-col"
      style={{ background: '#101214' }}
    >
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
          Menu Principal
        </p>

        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
              ].join(' ')
            }
            style={({ isActive }) => isActive ? { background: '#7DC82E' } : {}}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Rodapé ───────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border px-3 pb-4 pt-3">
        {/* Próximos documentos */}
        <div className="mb-3 rounded-[11px] bg-sidebar-next p-3">
          <div className="mb-1 text-[9px] uppercase tracking-[0.07em] text-[#3a3a3a]">
            Próximos Documentos
          </div>
          <div className="mb-0.5 text-[12px] font-semibold text-[#ddd]">Folha de Pagamento</div>
          <div className="mb-2 text-[10px] text-[#444]">Vence em 3 dias</div>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[9px] font-medium text-brand">
              Holerite
            </span>
            <button className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: '#2A2D35' }}
          >
            {iniciais}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{email}</p>
            <p className="text-[10px] text-gray-500">Contabilidade</p>
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
