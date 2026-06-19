import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@contabhub/supabase'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios')
}

/** Cliente para Server Components e Route Handlers (respeita RLS da sessão) */
export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  // O tipo de retorno de @supabase/ssr está atrelado a uma versão mais antiga
  // do supabase-js; reafirmamos o tipo do client instalado para que as queries
  // tipadas resolvam corretamente (em vez de colapsar para `never`).
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
  }) as unknown as SupabaseClient<Database>
}

/** Cliente admin com service role — usa apenas em Server Actions protegidas */
export function createAdminClient(): SupabaseClient<Database> {
  return createSupabase<Database>(supabaseUrl, supabaseServiceRoleKey)
}
