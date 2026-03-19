import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'

type Empresa = Database['public']['Tables']['empresas']['Row']

export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarEmpresas()
  }, [])

  async function carregarEmpresas() {
    setCarregando(true)
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('nome')
    setEmpresas(data ?? [])
    setCarregando(false)
  }

  async function toggleAtivo(empresa: Empresa) {
    await supabase
      .from('empresas')
      .update({ ativo: !empresa.ativo })
      .eq('id', empresa.id)
    setEmpresas((prev) =>
      prev.map((e) => (e.id === empresa.id ? { ...e, ativo: !e.ativo } : e))
    )
  }

  const empresasFiltradas = empresas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpj.includes(busca.replace(/\D/g, ''))
  )

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500">
            {empresas.filter((e) => e.ativo).length} ativas de {empresas.length} cadastradas
          </p>
        </div>
        <Link
          to="/empresas/nova"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Nova Empresa
        </Link>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {busca ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada ainda.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">E-mail</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresasFiltradas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{empresa.nome}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono">{formatarCnpj(empresa.cnpj)}</td>
                  <td className="px-6 py-3 text-gray-500">{empresa.email}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        empresa.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/empresas/${empresa.id}/funcionarios`}
                        className="text-blue-600 hover:underline"
                      >
                        Funcionários
                      </Link>
                      <Link
                        to={`/empresas/${empresa.id}`}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => toggleAtivo(empresa)}
                        className={`text-xs ${
                          empresa.ativo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {empresa.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
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

function formatarCnpj(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14) return cnpj
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}
