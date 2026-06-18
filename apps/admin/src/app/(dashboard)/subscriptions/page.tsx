import { createClient } from '@/lib/supabase/server'
import { formatarData, formatarMoeda } from '@contabhub/shared'
import { StatusBadgeSubscription } from '@contabhub/ui'
import Link from 'next/link'
import type { StatusSubscription } from '@contabhub/shared'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('subscriptions')
    .select(
      `
      id, status, proximo_vencimento, stripe_subscription_id, created_at,
      tenants(id, nome, email),
      planos(nome, preco_mensal)
    `
    )
    .order('created_at', { ascending: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status as StatusSubscription)
  }

  const { data: subs } = await query
  const lista = subs ?? []

  // Calcula MRR do filtro atual
  const mrr = lista
    .filter((s) => s.status === 'ativo')
    .reduce(
      (acc, s) => acc + ((s.planos as unknown as { preco_mensal: number })?.preco_mensal ?? 0),
      0
    )

  const statusOpcoes: Array<{ valor: string; label: string }> = [
    { valor: '', label: 'Todas' },
    { valor: 'ativo', label: 'Ativas' },
    { valor: 'trial', label: 'Trial' },
    { valor: 'inadimplente', label: 'Inadimplentes' },
    { valor: 'cancelado', label: 'Canceladas' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500">
          {lista.length} assinatura{lista.length !== 1 ? 's' : ''} · MRR filtrado:{' '}
          <strong>{formatarMoeda(mrr)}</strong>
        </p>
      </div>

      {/* Filtro de status */}
      <div className="mb-4 flex gap-1">
        {statusOpcoes.map((op) => (
          <Link
            key={op.valor}
            href={op.valor ? `/subscriptions?status=${op.valor}` : '/subscriptions'}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              searchParams.status === op.valor || (!searchParams.status && !op.valor)
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {op.label}
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {lista.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            Nenhuma subscription encontrada.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-6 py-3">Tenant</th>
                <th className="px-6 py-3">Plano</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Stripe Sub ID</th>
                <th className="px-6 py-3">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((sub) => {
                const tenant = sub.tenants as unknown as { id: string; nome: string; email: string }
                const plano = sub.planos as unknown as { nome: string; preco_mensal: number }

                return (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/tenants/${tenant?.id}`}
                        className="font-medium text-gray-900 hover:text-violet-600"
                      >
                        {tenant?.nome}
                      </Link>
                      <p className="text-xs text-gray-400">{tenant?.email}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{plano?.nome}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatarMoeda(plano?.preco_mensal ?? 0)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadgeSubscription status={sub.status as StatusSubscription} />
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {sub.proximo_vencimento ? formatarData(sub.proximo_vencimento) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-gray-400">
                        {sub.stripe_subscription_id ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {formatarData(sub.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
