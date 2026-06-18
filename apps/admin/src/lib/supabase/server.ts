import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
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

/**
 * Cliente para Server Components e Route Handlers (respeita RLS da sessão).
 *
 * O retorno é anotado como `SupabaseClient<Database>` porque o
 * `@supabase/ssr@0.5.x` passa os generics na ordem posicional antiga para o
 * `SupabaseClient` do supabase-js 2.99 (cuja assinatura mudou), o que faria
 * `.from()` inferir `never`. O cast restaura a tipagem correta do schema sem
 * alterar o comportamento em runtime.
 */
export function createClient(): SupabaseClient<Database> {
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
  }) as unknown as SupabaseClient<Database>
}

/** Cliente admin com service role — usa apenas em Server Actions protegidas */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey)
}
