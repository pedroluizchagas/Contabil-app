import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'

type Empresa = Database['public']['Tables']['empresas']['Row']

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarEmpresas()
  }, [])

  async function carregarEmpresas() {
    setCarregando(true)
    try {
      const { data } = await supabase.from('empresas').select('*').order('nome')
      setEmpresas(data ?? [])
    } finally {
      setCarregando(false)
    }
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

  const empresasFiltradas = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca.replace(/\D/g, ''))
  )

  const totalAtivas = empresas.filter((e) => e.ativo).length

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* Top Bar */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight text-ink">Empresas</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            {totalAtivas} ativa{totalAtivas !== 1 ? 's' : ''} de {empresas.length} cadastrada{empresas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/empresas/nova"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#111] transition-opacity hover:opacity-90"
        >
          <IconPlus />
          Nova Empresa
        </Link>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 rounded-card bg-card px-4 py-[10px] shadow-card">
        <span className="text-ink-xfaint">
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Buscar por nome ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder-ink-xfaint"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="text-[11px] text-ink-xfaint transition-colors hover:text-ink-muted"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-card bg-card shadow-card">
        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-ink-faint">
            {busca
              ? 'Nenhuma empresa encontrada para esta busca.'
              : 'Nenhuma empresa cadastrada ainda. '}
            {!busca && (
              <Link to="/empresas/nova" className="text-brand hover:underline">
                Cadastrar primeira empresa
              </Link>
            )}
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f5f5f5] text-left">
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Empresa</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">CNPJ</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">E-mail</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Status</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {empresasFiltradas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="border-b border-[#f9f9f9] transition-colors last:border-b-0 hover:bg-[#fafafa]"
                >
                  <td className="px-5 py-3 font-medium text-ink">{empresa.nome}</td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-ink-muted">
                    {formatarCnpj(empresa.cnpj)}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{empresa.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        empresa.ativo
                          ? 'bg-brand-muted text-brand-dark'
                          : 'bg-[#f5f5f5] text-[#888]'
                      }`}
                    >
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/empresas/${empresa.id}/funcionarios`}
                        className="flex items-center gap-1 text-[11.5px] font-medium text-brand transition-opacity hover:opacity-75"
                      >
                        <IconUsers />
                        Funcionarios
                      </Link>
                      <Link
                        to={`/empresas/${empresa.id}`}
                        className="text-[11.5px] text-ink-muted transition-colors hover:text-ink"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => toggleAtivo(empresa)}
                        className={`text-[11.5px] transition-colors ${
                          empresa.ativo
                            ? 'text-danger hover:opacity-75'
                            : 'text-brand-dark hover:opacity-75'
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
