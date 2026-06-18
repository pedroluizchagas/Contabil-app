import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@contabhub/supabase'

// URL e anon key são valores públicos: usar o prefixo NEXT_PUBLIC_ garante
// que server, middleware e client components leiam exatamente as mesmas
// variáveis. A service role key permanece sem prefixo (segredo server-only).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios')
}

/** Cliente para Server Components e Route Handlers (respeita RLS da sessão) */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => { cookieStore.set({ name, value, ...options }) },
      remove: (name, options) => { cookieStore.set({ name, value: '', ...options }) },
    },
  })
}

/** Cliente admin com service role — usa apenas em Server Actions protegidas */
export function createAdminClient() {
  const { createClient: createSupabase } = require('@supabase/supabase-js')
  return createSupabase<Database>(supabaseUrl, supabaseServiceRoleKey)
}
