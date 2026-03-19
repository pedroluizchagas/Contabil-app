import { createClient } from '@/lib/supabase/server'
import { formatarCnpj, formatarData, formatarMoeda } from '@contabhub/shared'
import { StatusBadgeTenant, StatusBadgeSubscription } from '@contabhub/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlterarStatusTenant } from './AlterarStatusTenant'
import type { StatusTenant, StatusSubscription } from '@contabhub/shared'

export const dynamic = 'force-dynamic'

export default async function TenantDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [tenantRes, empresasRes, docsRes] = await Promise.all([
    supabase
      .from('tenants')
      .select(`id, nome, cnpj, email, status, created_at,
        subscriptions(id, status, proximo_vencimento, planos(nome, preco_mensal, limite_empresas, limite_funcionarios))`)
      .eq('id', params.id)
      .single(),
    supabase
      .from('empresas')
      .select('id, nome, cnpj, ativo, created_at')
      .eq('tenant_id', params.id)
      .order('nome'),
    supabase
      .from('documentos')
      .select('id, tipo, created_at')
      .eq('tenant_id', params.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  if (!tenantRes.data) notFound()

  const tenant = tenantRes.data
  const empresas = empresasRes.data ?? []
  const sub = (tenant.subscriptions as unknown as Array<{
    id: string
    status: StatusSubscription
    proximo_vencimento: string | null
    planos: { nome: string; preco_mensal: number; limite_empresas: number; limite_funcionarios: number }
  }>)?.[0]

  return (
    <div className="p-8">
      <div className="mb-2">
        <Link href="/tenants" className="text-sm text-gray-500 hover:text-gray-700">
          ← Tenants
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.nome}</h1>
          <p className="text-sm text-gray-500">
            {formatarCnpj(tenant.cnpj)} · {tenant.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadgeTenant status={tenant.status as StatusTenant} />
          <AlterarStatusTenant tenantId={tenant.id} statusAtual={tenant.status as StatusTenant} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Subscription */}
        <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Subscription</h2>
          {sub ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Plano</span>
                <span className="font-medium">{sub.planos?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor</span>
                <span className="font-medium">{formatarMoeda(sub.planos?.preco_mensal ?? 0)}/mês</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadgeSubscription status={sub.status} />
              </div>
              {sub.proximo_vencimento && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vencimento</span>
                  <span>{formatarData(sub.proximo_vencimento)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Limite empresas</span>
                <span>{sub.planos?.limite_empresas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uso atual</span>
                <span className={empresas.length > sub.planos?.limite_empresas ? 'text-red-600 font-semibold' : ''}>
                  {empresas.length} / {sub.planos?.limite_empresas}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sem subscription ativa.</p>
          )}
        </div>

        {/* Métricas do mês */}
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <MiniCard label="Empresas" valor={empresas.length} />
          <MiniCard label="Ativas" valor={empresas.filter((e) => e.ativo).length} cor="green" />
          <MiniCard label="Docs este mês" valor={docsRes.data?.length ?? 0} cor="blue" />
          <MiniCard label="Holerites" valor={(docsRes.data ?? []).filter((d) => d.tipo === 'holerite').length} />
          <MiniCard label="Férias" valor={(docsRes.data ?? []).filter((d) => d.tipo === 'ferias').length} />
          <MiniCard label="Cliente desde" valor={new Date(tenant.created_at).getFullYear()} />
        </div>
      </div>

      {/* Lista de empresas */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-800">Empresas ({empresas.length})</h2>
        </div>
        {empresas.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhuma empresa cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Desde</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{empresa.nome}</td>
                  <td className="px-6 py-3 font-mono text-gray-500 text-xs">{formatarCnpj(empresa.cnpj)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${empresa.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-400">{formatarData(empresa.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MiniCard({ label, valor, cor = 'gray' }: { label: string; valor: number | string; cor?: string }) {
  const cores: Record<string, string> = {
    gray: 'text-gray-900', green: 'text-green-600', blue: 'text-blue-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cores[cor] ?? 'text-gray-900'}`}>{valor}</p>
    </div>
  )
}
