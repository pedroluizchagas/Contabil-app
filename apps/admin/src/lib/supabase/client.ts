'use client'

import { createBrowserClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@contabhub/supabase'

export function createClient(): SupabaseClient<Database> {
  // Reafirma o tipo do supabase-js instalado para que as queries tipadas
  // resolvam corretamente (o tipo de retorno do @supabase/ssr é mais antigo).
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}
