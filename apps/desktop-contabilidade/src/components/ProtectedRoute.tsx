import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#101214' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ background: '#7DC82E' }}
          >
            C
          </div>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
