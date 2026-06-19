'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
    >
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
      Sair da conta
    </button>
  )
}
