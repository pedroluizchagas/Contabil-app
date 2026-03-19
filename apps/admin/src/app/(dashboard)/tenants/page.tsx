import { createClient } from '@/lib/supabase/server'
import { formatarCnpj, formatarData } from '@contabhub/shared'
import { StatusBadgeTenant, StatusBadgeSubscription } from '@contabhub/ui'
import Link from 'next/link'
import type { StatusTenant, StatusSubscription } from '@contabhub/shared'

export const dynamic = 'force-dynamic'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: { status?: string; busca?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('tenants')
    .select(`
      id, nome, cnpj, email, status, created_at,
      subscriptions(status, planos(nome, preco_mensal)),
      empresas(count)
    `)
    .order('created_at', { ascending: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: tenants } = await query

  const filtrados = searchParams.busca
    ? (tenants ?? []).filter(
        (t) =>
          t.nome.toLowerCase().includes(searchParams.busca!.toLowerCase()) ||
          t.cnpj.includes(searchParams.busca!.replace(/\D/g, '')) ||
          t.email.toLowerCase().includes(searchParams.busca!.toLowerCase())
      )
    : (tenants ?? [])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500">{filtrados.length} contabilidades cadastradas</p>
        </div>
        <Link
          href="/tenants/novo"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          + Novo Tenant
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-3">
        <FiltroStatus atual={searchParams.status} />
        <form>
          {searchParams.status && (
            <input type="hidden" name="status" value={searchParams.status} />
          )}
          <input
            name="busca"
            defaultValue={searchParams.busca}
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 w-72"
          />
        </form>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Nenhum tenant encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Plano</th>
                <th className="px-6 py-3">Empresas</th>
                <th className="px-6 py-3">Desde</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((tenant) => {
                const sub = (tenant.subscriptions as unknown as Array<{ status: StatusSubscription; planos: { nome: string; preco_mensal: number } | null }>)?.[0]
                const qtdEmpresas = (tenant.empresas as unknown as Array<{ count: number }>)?.[0]?.count ?? 0

                return (
                  <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{tenant.nome}</p>
                      <p className="text-xs text-gray-400">{tenant.email}</p>
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-500 text-xs">
                      {formatarCnpj(tenant.cnpj)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadgeTenant status={tenant.status as StatusTenant} />
                    </td>
                    <td className="px-6 py-3">
                      {sub ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{sub.planos?.nome}</p>
                          <StatusBadgeSubscription status={sub.status} />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{qtdEmpresas}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {formatarData(tenant.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-violet-600 hover:underline text-xs font-medium"
                      >
                        Ver detalhe
                      </Link>
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

function FiltroStatus({ atual }: { atual?: string }) {
  const opcoes = [
    { valor: '', label: 'Todos' },
    { valor: 'trial', label: 'Trial' },
    { valor: 'ativo', label: 'Ativos' },
    { valor: 'inadimplente', label: 'Inadimplentes' },
    { valor: 'inativo', label: 'Inativos' },
  ]
  return (
    <div className="flex gap-1">
      {opcoes.map((op) => (
        <Link
          key={op.valor}
          href={op.valor ? `/tenants?status=${op.valor}` : '/tenants'}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            atual === op.valor || (!atual && !op.valor)
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {op.label}
        </Link>
      ))}
    </div>
  )
}
