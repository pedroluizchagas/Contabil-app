import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Lê uma variável de ambiente de forma agnóstica ao runtime. Este pacote é
 * consumido tanto por apps Vite (que injetam `import.meta.env`) quanto por
 * Next/Node (que usam `process.env`), então evitamos depender dos tipos
 * globais de um único ambiente para não quebrar o type-check dos consumidores.
 */
function lerEnv(...chaves: string[]): string {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env
  for (const chave of chaves) {
    const valor = viteEnv?.[chave] ?? nodeEnv?.[chave]
    if (valor) return valor
  }
  return ''
}

const supabaseUrl = lerEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
const supabaseAnonKey = lerEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios.')
}

// Cliente singleton tipado com o schema gerado pelo Supabase CLI
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
