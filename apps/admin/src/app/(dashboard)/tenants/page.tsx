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
    query = query.eq('status', searchParams.status as 'ativo' | 'inativo' | 'trial' | 'inadimplente')
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
          <h1 className="text-2xl font-bold text-ink">Tenants</h1>
          <p className="text-sm text-ink-muted">{filtrados.length} contabilidades cadastradas</p>
        </div>
        <Link
          href="/tenants/novo"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
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
            className="w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </form>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        {filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint">Nenhum tenant encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-ink-faint">
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
                      <p className="font-medium text-ink">{tenant.nome}</p>
                      <p className="text-xs text-ink-faint">{tenant.email}</p>
                    </td>
                    <td className="px-6 py-3 font-mono text-ink-muted text-xs">
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
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-ink-muted">{qtdEmpresas}</td>
                    <td className="px-6 py-3 text-xs text-ink-faint">
                      {formatarData(tenant.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-xs font-medium text-brand-dark hover:underline"
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
              ? 'bg-brand text-white'
              : 'bg-gray-100 text-ink-muted hover:bg-gray-200'
          }`}
        >
          {op.label}
        </Link>
      ))}
    </div>
  )
}
