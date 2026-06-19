import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'
import { Badge, Card, EmptyState, Input, PageHeader, PageSpinner } from '@/components/ui'

type Funcionario = Database['public']['Tables']['funcionarios']['Row'] & {
  docs_total?: number
  docs_nao_lidos?: number
}

export function FuncionariosPage() {
  const { empresa } = useAuth()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!empresa) return
    carregarFuncionarios(empresa.id)
  }, [empresa])

  async function carregarFuncionarios(empresaId: string) {
    setCarregando(true)
    setErro(null)

    const [funcsRes, docsRes] = await Promise.all([
      supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome'),
      supabase
        .from('v_status_documentos')
        .select('funcionario_id, visualizado_em')
        .eq('empresa_id', empresaId),
    ])

    if (funcsRes.error || docsRes.error) {
      console.error('Erro ao carregar funcionários:', funcsRes.error?.message ?? docsRes.error?.message)
      setErro('Não foi possível carregar os funcionários. Tente novamente.')
      setFuncionarios([])
      setCarregando(false)
      return
    }

    const docs = docsRes.data ?? []
    const contagem = new Map<string, { total: number; naoLidos: number }>()
    for (const d of docs) {
      const atual = contagem.get(d.funcionario_id) ?? { total: 0, naoLidos: 0 }
      contagem.set(d.funcionario_id, {
        total: atual.total + 1,
        naoLidos: atual.naoLidos + (d.visualizado_em ? 0 : 1),
      })
    }

    const funcs = (funcsRes.data ?? []).map((f) => ({
      ...f,
      docs_total: contagem.get(f.id)?.total ?? 0,
      docs_nao_lidos: contagem.get(f.id)?.naoLidos ?? 0,
    }))

    setFuncionarios(funcs)
    setCarregando(false)
  }

  const termo = busca.toLowerCase()
  const filtrados = funcionarios.filter(
    (f) =>
      (f.nome ?? '').toLowerCase().includes(termo) ||
      (f.codigo ?? '').toLowerCase().includes(termo) ||
      (f.email ?? '').toLowerCase().includes(termo)
  )

  const ativos = funcionarios.filter((f) => f.ativo).length

  return (
    <div className="p-8">
      <PageHeader
        titulo="Funcionários"
        subtitulo={`${ativos} ativos de ${funcionarios.length} cadastrados`}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="text"
          placeholder="Buscar por nome, código ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {carregando ? (
        <PageSpinner />
      ) : erro ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-red-600">{erro}</p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState
            icone="👥"
            titulo={busca ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
            descricao={busca ? 'Tente outro termo de busca.' : undefined}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-ink-faint">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">E-mail</th>
                <th className="px-6 py-3">Docs enviados</th>
                <th className="px-6 py-3">Pendentes de leitura</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((func) => (
                <tr key={func.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-ink">{func.nome}</td>
                  <td className="px-6 py-3 font-mono text-ink-muted">{func.codigo}</td>
                  <td className="px-6 py-3 text-ink-muted">{func.email}</td>
                  <td className="px-6 py-3 text-ink">{func.docs_total ?? 0}</td>
                  <td className="px-6 py-3">
                    {(func.docs_nao_lidos ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {func.docs_nao_lidos}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={func.ativo ? 'success' : 'neutral'}>
                      {func.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
