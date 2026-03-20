import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-sidebar-bg" style={{ padding: '12px 12px 12px 0' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden rounded-panel bg-surface">
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
