import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'

type Funcionario = Database['public']['Tables']['funcionarios']['Row'] & {
  docs_total?: number
  docs_nao_lidos?: number
}

export function FuncionariosPage() {
  const { empresa } = useAuth()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!empresa) return
    carregarFuncionarios()
  }, [empresa])

  async function carregarFuncionarios() {
    setCarregando(true)

    const [funcsRes, docsRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('empresa_id', empresa!.id).order('nome'),
      supabase
        .from('v_status_documentos')
        .select('funcionario_id, visualizado_em')
        .eq('empresa_id', empresa!.id),
    ])

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

  const filtrados = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      f.email.toLowerCase().includes(busca.toLowerCase())
  )

  const ativos = funcionarios.filter((f) => f.ativo).length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
        <p className="text-sm text-gray-500">
          {ativos} ativos de {funcionarios.length} cadastrados
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, código ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {busca ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
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
                  <td className="px-6 py-3 font-medium text-gray-900">{func.nome}</td>
                  <td className="px-6 py-3 font-mono text-gray-500">{func.codigo}</td>
                  <td className="px-6 py-3 text-gray-500">{func.email}</td>
                  <td className="px-6 py-3 text-gray-700">{func.docs_total ?? 0}</td>
                  <td className="px-6 py-3">
                    {(func.docs_nao_lidos ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {func.docs_nao_lidos}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        func.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {func.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
