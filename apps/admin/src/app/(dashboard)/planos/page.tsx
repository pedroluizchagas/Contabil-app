import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@contabhub/shared'
import { PlanoForm } from './PlanoForm'

export const dynamic = 'force-dynamic'

export default async function PlanosPage() {
  const supabase = createClient()

  const [planosRes, subsRes] = await Promise.all([
    supabase.from('planos').select('*').order('preco_mensal'),
    supabase.from('subscriptions').select('plano_id, status'),
  ])

  const planos = planosRes.data ?? []
  const subs = subsRes.data ?? []

  // Conta subscribers por plano
  const countPorPlano = new Map<string, number>()
  for (const s of subs.filter((s) => s.status === 'ativo')) {
    countPorPlano.set(s.plano_id, (countPorPlano.get(s.plano_id) ?? 0) + 1)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Planos</h1>
        <p className="text-sm text-ink-muted">Gerencie os planos de assinatura do ContaHub</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lista de planos */}
        <div className="space-y-4">
          {planos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-ink-faint">
              Nenhum plano cadastrado ainda.
            </div>
          ) : (
            planos.map((plano) => {
              const ativos = countPorPlano.get(plano.id) ?? 0
              const mrr = ativos * plano.preco_mensal

              return (
                <div
                  key={plano.id}
                  className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-card ${!plano.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink">{plano.nome}</h3>
                      <p className="text-xl font-bold text-brand-dark mt-0.5">
                        {formatarMoeda(plano.preco_mensal)}
                        <span className="text-sm font-normal text-ink-faint">/mês</span>
                      </p>
                    </div>
                    {!plano.ativo && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-ink-muted">
                        Inativo
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-xs text-ink-faint">Empresas</p>
                      <p className="font-semibold text-ink">{plano.limite_empresas}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-xs text-ink-faint">Funcionários</p>
                      <p className="font-semibold text-ink">{plano.limite_funcionarios}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-xs text-ink-faint">Assinantes</p>
                      <p className="font-semibold text-brand-dark">{ativos}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>
                      MRR deste plano: <strong className="text-ink">{formatarMoeda(mrr)}</strong>
                    </span>
                    <PlanoToggle planoId={plano.id} ativo={plano.ativo} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Formulário novo plano */}
        <div>
          <PlanoForm />
        </div>
      </div>
    </div>
  )
}

function PlanoToggle({ planoId, ativo }: { planoId: string; ativo: boolean }) {
  // Server Action inline
  async function toggle() {
    'use server'
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    await supabase.from('planos').update({ ativo: !ativo }).eq('id', planoId)
  }

  return (
    <form action={toggle}>
      <button
        type="submit"
        className={`text-xs underline ${ativo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
      >
        {ativo ? 'Desativar' : 'Ativar'}
      </button>
    </form>
  )
}
