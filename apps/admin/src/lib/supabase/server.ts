import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@contabhub/supabase'

// A validação é feita dentro das funções (lazy) para não lançar no carregamento
// do módulo — caso contrário o `next build` falha ao coletar dados das páginas
// quando as variáveis ainda não estão presentes no ambiente de build.
function lerEnv(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`)
  }
  return valor
}

/** Cliente para Server Components e Route Handlers (respeita RLS da sessão) */
export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  // O tipo de retorno de @supabase/ssr está atrelado a uma versão mais antiga
  // do supabase-js; reafirmamos o tipo do client instalado para que as queries
  // tipadas resolvam corretamente (em vez de colapsar para `never`).
  return createServerClient<Database>(lerEnv('SUPABASE_URL'), lerEnv('SUPABASE_ANON_KEY'), {
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
  return createSupabase<Database>(lerEnv('SUPABASE_URL'), lerEnv('SUPABASE_SERVICE_ROLE_KEY'))
}
