import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'
import { ImportacaoExcel } from './ImportacaoExcel'

type Funcionario = Database['public']['Tables']['funcionarios']['Row']

export function FuncionariosPage() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [empresaNome, setEmpresaNome] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [mostrarImportacao, setMostrarImportacao] = useState(false)

  useEffect(() => {
    if (!empresaId) return
    Promise.all([carregarFuncionarios(), carregarEmpresa()])
  }, [empresaId])

  async function carregarEmpresa() {
    const { data } = await supabase.from('empresas').select('nome').eq('id', empresaId!).single()
    if (data) setEmpresaNome(data.nome)
  }

  async function carregarFuncionarios() {
    setCarregando(true)
    const { data } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('empresa_id', empresaId!)
      .order('nome')
    setFuncionarios(data ?? [])
    setCarregando(false)
  }

  async function toggleAtivo(func: Funcionario) {
    await supabase.from('funcionarios').update({ ativo: !func.ativo }).eq('id', func.id)
    setFuncionarios((prev) => prev.map((f) => (f.id === func.id ? { ...f, ativo: !f.ativo } : f)))
  }

  const filtrados = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    f.email.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-2">
        <Link to="/empresas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Empresas
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-sm text-gray-500">
            {empresaNome} · {funcionarios.filter((f) => f.ativo).length} ativos de {funcionarios.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarImportacao(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Importar Excel
          </button>
          <Link
            to={`/empresas/${empresaId}/funcionarios/novo`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + Novo Funcionário
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, código ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {busca ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado ainda.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">E-mail</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((func) => (
                <tr key={func.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{func.nome}</td>
                  <td className="px-6 py-3 font-mono text-gray-500">{func.codigo}</td>
                  <td className="px-6 py-3 text-gray-500">{func.email}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${func.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {func.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/empresas/${empresaId}/funcionarios/${func.id}`}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => toggleAtivo(func)}
                        className={`text-xs ${func.ativo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {func.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mostrarImportacao && (
        <ImportacaoExcel
          empresaId={empresaId!}
          onFechar={() => setMostrarImportacao(false)}
          onConcluir={() => { setMostrarImportacao(false); carregarFuncionarios() }}
        />
      )}
    </div>
  )
}
