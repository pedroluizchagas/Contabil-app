'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Resultado = { ok?: true; error?: string }
type StatusConvite = 'lead' | 'contatado' | 'aprovado' | 'ativo' | 'recusado'

/** Cria um novo lead no funil de onboarding fechado. */
export async function criarConvite(formData: FormData): Promise<Resultado> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  if (!nome || !email) return { error: 'Nome e e-mail são obrigatórios.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('convites').insert({
    nome,
    email,
    cnpj: (String(formData.get('cnpj') ?? '').trim() || null) as string | null,
    plano_id: (String(formData.get('plano_id') ?? '').trim() || null) as string | null,
    notas: (String(formData.get('notas') ?? '').trim() || null) as string | null,
  })
  if (error) return { error: error.message }
  revalidatePath('/convites')
  return { ok: true }
}

/** Atualiza o status (e opcionalmente o plano) de um convite. */
export async function atualizarConvite(
  id: string,
  campos: { status?: StatusConvite; plano_id?: string | null }
): Promise<Resultado> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('convites').update(campos).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/convites')
  return { ok: true }
}

/**
 * Provisiona o tenant a partir de um convite aprovado, chamando a Edge Function
 * `provisionar-tenant` com a service role key (cria tenant + contador +
 * assinatura Stripe e dispara o e-mail de boas-vindas).
 */
export async function provisionarConvite(id: string): Promise<Resultado> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.functions.invoke('provisionar-tenant', {
    body: { convite_id: id },
  })
  if (error) {
    // A Edge Function devolve a mensagem de erro no corpo quando aplicável.
    const detalhe = (data as { error?: string } | null)?.error
    return { error: detalhe ?? error.message }
  }
  revalidatePath('/convites')
  revalidatePath('/tenants')
  return { ok: true }
}
