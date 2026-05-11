import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@contabhub/supabase'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios')
}

/** Cliente para Server Components e Route Handlers (respeita RLS da sessão) */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        cookieStore.set({ name, value, ...options })
      },
      remove: (name: string, options: CookieOptions) => {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}

/** Cliente admin com service role — usa apenas em Server Actions protegidas */
export function createAdminClient() {
  return createSupabase<Database>(supabaseUrl, supabaseServiceRoleKey)
}
