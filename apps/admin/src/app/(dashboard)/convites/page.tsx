import { createAdminClient } from '@/lib/supabase/server'
import { ConvitesClient } from './ConvitesClient'

export const dynamic = 'force-dynamic'

export default async function ConvitesPage() {
  // Service role: convites e o funil de onboarding são dados do owner (RLS
  // bloqueia acesso anônimo). O acesso à rota já é gated pelo middleware admin.
  const supabase = createAdminClient()

  const [convitesRes, planosRes] = await Promise.all([
    supabase
      .from('convites')
      .select('id, nome, cnpj, email, plano_id, status, notas, tenant_id, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('planos').select('id, nome, stripe_price_id').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
        <p className="text-sm text-gray-500">
          Onboarding fechado — qualifique, aprove e provisione contabilidades.
        </p>
      </div>

      <ConvitesClient convites={convitesRes.data ?? []} planos={planosRes.data ?? []} />
    </div>
  )
}
