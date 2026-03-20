import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: JSX.Element
}

function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconEmpresas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}

function IconDocumentos() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

const mainNavItems: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',     icon: <IconDashboard /> },
  { to: '/empresas',     label: 'Empresas',       icon: <IconEmpresas /> },
  { to: '/lotes/upload', label: 'Enviar Lote',    icon: <IconUpload /> },
  { to: '/documentos',   label: 'Documentos',     icon: <IconDocumentos /> },
]

const configNavItems: NavItem[] = [
  { to: '/configuracoes', label: 'Configuracoes', icon: <IconSettings /> },
  { to: '/ajuda',         label: 'Central de Ajuda', icon: <IconHelp /> },
]

export function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="flex w-[210px] min-w-[210px] flex-col bg-sidebar-bg" style={{ padding: '8px 0 12px' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5" style={{ padding: '4px 16px 16px' }}>
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px] bg-brand text-[13px] font-extrabold text-[#111]"
        >
          C
        </div>
        <span className="flex-1 text-[15px] font-semibold text-white">ContaHub</span>
      </div>

      {/* Busca */}
      <div className="mx-3 mb-1 flex items-center gap-1.5 rounded-lg bg-sidebar-search px-2.5 py-2">
        <IconSearch />
        <input
          type="text"
          placeholder="Pesquise aqui..."
          className="w-full bg-transparent text-[11.5px] text-[#666] outline-none placeholder-[#555] font-[inherit]"
        />
        <span className="whitespace-nowrap rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[9px] text-[#555]">
          Ctrl K
        </span>
      </div>

      {/* Menu Principal */}
      <div className="mt-3.5 px-4 pb-1 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-section">
        Menu Principal
      </div>

      <nav className="flex flex-col">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-4 text-[12px] transition-colors ${
                isActive
                  ? 'text-brand'
                  : 'text-sidebar-item hover:text-sidebar-item-hover'
              }`
            }
            style={{ paddingTop: '8.5px', paddingBottom: '8.5px' }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l bg-brand" />
                )}
                {item.icon}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Configuracoes */}
      <div className="mt-1.5 px-4 pb-1 pt-3.5 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-section">
        Configuracoes
      </div>

      <nav className="flex flex-col">
        {configNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-4 text-[12px] transition-colors ${
                isActive
                  ? 'text-brand'
                  : 'text-sidebar-item hover:text-sidebar-item-hover'
              }`
            }
            style={{ paddingTop: '8.5px', paddingBottom: '8.5px' }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l bg-brand" />
                )}
                {item.icon}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-4 text-left text-[12px] text-sidebar-item transition-colors hover:text-sidebar-item-hover"
          style={{ paddingTop: '8.5px', paddingBottom: '8.5px' }}
        >
          <IconLogout />
          Sair
        </button>
      </nav>

      {/* Rodape — proximo evento */}
      <div className="mt-auto border-t border-sidebar-border pt-2">
        <div className="mx-3 mt-2.5 rounded-[11px] bg-sidebar-next p-3">
          <div className="mb-1 text-[9px] uppercase tracking-[0.07em] text-[#3a3a3a]">
            Proximos Documentos
          </div>
          <div className="mb-0.5 text-[12px] font-semibold text-[#ddd]">Folha de Pagamento</div>
          <div className="mb-2 text-[10px] text-[#444]">Vence em 3 dias</div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[9px] font-medium text-brand">
                Holerite
              </span>
            </div>
            <button className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-[#111]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
