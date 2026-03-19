import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',       icon: '⊞' },
  { to: '/documentos',    label: 'Documentos',       icon: '📄' },
  { to: '/funcionarios',  label: 'Funcionários',     icon: '👥' },
  { to: '/conta',         label: 'Minha Conta',      icon: '⚙' },
]

export function Sidebar() {
  const { logout, empresa } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-gray-100">
      {/* Logo */}
      <div className="flex h-16 flex-col justify-center border-b border-gray-700 px-5">
        <span className="text-base font-bold text-white">ContaHub</span>
        {empresa && (
          <span className="truncate text-xs text-gray-400">{empresa.nome}</span>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors mb-0.5 ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="border-t border-gray-700 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>⎋</span>
          Sair
        </button>
      </div>
    </aside>
  )
}
