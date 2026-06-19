import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Lê variáveis de ambiente sem depender de @types/node (evita conflito de tipos
// em apps que já trazem os tipos do Node, como o admin Next.js) e sem lançar
// ReferenceError caso `process` não exista (ex.: bundle de browser).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios.')
}

// Cliente singleton tipado com o schema gerado pelo Supabase CLI
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
