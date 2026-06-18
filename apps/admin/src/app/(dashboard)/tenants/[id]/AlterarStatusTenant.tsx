'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { StatusTenant } from '@contabhub/shared'

const opcoes: Array<{ valor: StatusTenant; label: string }> = [
  { valor: 'ativo', label: 'Ativar' },
  { valor: 'inativo', label: 'Desativar' },
  { valor: 'inadimplente', label: 'Marcar Inadimplente' },
  { valor: 'trial', label: 'Voltar para Trial' },
]

export function AlterarStatusTenant({
  tenantId,
  statusAtual,
}: {
  tenantId: string
  statusAtual: StatusTenant
}) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  async function alterar(novoStatus: StatusTenant) {
    if (novoStatus === statusAtual) return
    setSalvando(true)
    await supabase.from('tenants').update({ status: novoStatus }).eq('id', tenantId)
    // Sincroniza subscription se necessário
    if (novoStatus === 'inativo' || novoStatus === 'inadimplente') {
      await supabase
        .from('subscriptions')
        .update({ status: novoStatus === 'inadimplente' ? 'inadimplente' : 'cancelado' })
        .eq('tenant_id', tenantId)
        .in('status', ['ativo', 'trial'])
    }
    router.refresh()
    setSalvando(false)
  }

  return (
    <div className="relative">
      <select
        disabled={salvando}
        value={statusAtual}
        onChange={(e) => alterar(e.target.value as StatusTenant)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-violet-500 disabled:opacity-50"
      >
        {opcoes.map((op) => (
          <option key={op.valor} value={op.valor}>
            {op.label}
          </option>
        ))}
      </select>
    </div>
  )
}
