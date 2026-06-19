import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden rounded-panel bg-surface">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
