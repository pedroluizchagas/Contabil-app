import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData } from '@contabhub/shared'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  // Paralelo: todas as queries ao mesmo tempo
  const [
    tenantsRes,
    subAtivasRes,
    novosTenantsRes,
    documentosRes,
    lotesRes,
    planosRes,
  ] = await Promise.all([
    supabase.from('tenants').select('id, status', { count: 'exact' }),
    supabase.from('subscriptions').select('plano_id, planos(preco_mensal)').eq('status', 'ativo'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).gte('created_at', inicioMes),
    supabase.from('documentos').select('id', { count: 'exact', head: true }).gte('created_at', inicioMes),
    supabase.from('lotes').select('id, status, created_at, empresas(nome), tenants(nome)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('planos').select('id, nome, preco_mensal').eq('ativo', true),
  ])

  // Calcula MRR
  const mrr = (subAtivasRes.data ?? []).reduce((acc, s) => {
    const preco = (s.planos as unknown as { preco_mensal: number })?.preco_mensal ?? 0
    return acc + preco
  }, 0)

  const totalTenants = tenantsRes.count ?? 0
  const tenantsAtivos = tenantsRes.data?.filter((t) => t.status === 'ativo').length ?? 0
  const tenantsTrial = tenantsRes.data?.filter((t) => t.status === 'trial').length ?? 0
  const tenantsInad = tenantsRes.data?.filter((t) => t.status === 'inadimplente').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">Visão geral do SaaS — {formatarData(agora.toISOString())}</p>
      </div>

      {/* MRR destaque */}
      <div className="mb-6 rounded-2xl border border-brand-light bg-brand-muted p-6 shadow-card">
        <p className="text-sm font-medium text-brand-dark">MRR (Receita Recorrente Mensal)</p>
        <p className="mt-1 text-4xl font-bold text-brand-darker">{formatarMoeda(mrr)}</p>
        <p className="mt-1 text-xs text-brand-dark">{subAtivasRes.data?.length ?? 0} subscriptions ativas</p>
      </div>

      {/* Métricas */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Tenants total" valor={totalTenants} sub={`${tenantsAtivos} ativos`} />
        <MetricCard label="Trial" valor={tenantsTrial} cor="blue" />
        <MetricCard label="Inadimplentes" valor={tenantsInad} cor="red" />
        <MetricCard
          label="Novos este mês"
          valor={novosTenantsRes.count ?? 0}
          cor="green"
          sub="tenants"
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <MetricCard label="Documentos enviados" valor={documentosRes.count ?? 0} sub="este mês" />
        <MetricCard label="Planos ativos" valor={planosRes.data?.length ?? 0} />
      </div>

      {/* Lotes recentes */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-ink">Lotes recentes (todos os tenants)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-ink-faint">
              <th className="px-6 py-3">Tenant</th>
              <th className="px-6 py-3">Empresa</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {(lotesRes.data ?? []).map((lote) => (
              <tr key={lote.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 text-ink-muted text-xs">
                  {(lote.tenants as unknown as { nome: string })?.nome ?? '—'}
                </td>
                <td className="px-6 py-3 font-medium text-ink">
                  {(lote.empresas as unknown as { nome: string })?.nome ?? '—'}
                </td>
                <td className="px-6 py-3">
                  <StatusLote status={lote.status} />
                </td>
                <td className="px-6 py-3 text-ink-faint text-xs">
                  {formatarData(lote.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard({
  label, valor, sub, cor = 'gray',
}: {
  label: string; valor: number; sub?: string; cor?: 'gray' | 'green' | 'blue' | 'red'
}) {
  const cores: Record<string, string> = {
    gray: 'text-ink', green: 'text-brand-dark', blue: 'text-blue-600', red: 'text-red-600',
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${cores[cor]}`}>{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  )
}

function StatusLote({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    concluido: 'bg-green-100 text-green-700',
    processando: 'bg-blue-100 text-blue-700',
    aguardando: 'bg-gray-100 text-gray-600',
    erro: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estilos[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
