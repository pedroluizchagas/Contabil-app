import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@contabhub/supabase'

// URL e anon key são valores públicos: usar o prefixo NEXT_PUBLIC_ garante
// que server, middleware e client components leiam exatamente as mesmas
// variáveis. A service role key permanece sem prefixo (segredo server-only).
//
// A leitura/validação é lazy (dentro das factories) de propósito: as páginas
// do admin são `force-dynamic`, então o cliente só é criado em request time.
// Validar no escopo do módulo quebraria o `next build` (etapa "Collecting page
// data") em qualquer ambiente sem as variáveis configuradas.
function lerCredenciais(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios')
  }
  return { url, anonKey }
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
  const { url, anonKey } = lerCredenciais()
  const cookieStore = cookies()
  return createServerClient<Database>(url, anonKey, {
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
  const { url } = lerCredenciais()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY é obrigatório')
  }
  return createSupabaseClient<Database>(url, serviceRoleKey)
}
