import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'
import {
  Button,
  Badge,
  Card,
  PageHeader,
  EmptyState,
  PageSpinner,
  Input,
} from '@contabhub/ui-desktop'
import { formatarCnpj } from '@contabhub/shared'

type Empresa = Database['public']['Tables']['empresas']['Row']

function IconUsers() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
    const { data } = await supabase.from('empresas').select('*').order('nome')
    setEmpresas(data ?? [])
    setCarregando(false)
  }

  async function toggleAtivo(empresa: Empresa) {
    await supabase.from('empresas').update({ ativo: !empresa.ativo }).eq('id', empresa.id)
    setEmpresas((prev) => prev.map((e) => (e.id === empresa.id ? { ...e, ativo: !e.ativo } : e)))
  }

  const empresasFiltradas = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca.replace(/\D/g, ''))
  )

  const ativas = empresas.filter((e) => e.ativo).length

  return (
    <div className="p-8">
      <PageHeader
        titulo="Empresas"
        subtitulo={`${ativas} ativas de ${empresas.length} cadastradas`}
        acao={
          <Link
            to="/empresas/nova"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Nova Empresa
          </Link>
        }
      />

      {/* Busca */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
          leftIcon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M9.5 9.5L13 13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          }
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
      <Card>
        {carregando ? (
          <PageSpinner />
        ) : empresasFiltradas.length === 0 ? (
          <EmptyState
            icone="🏢"
            titulo={busca ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada ainda.'}
            acao={
              !busca && (
                <Link to="/empresas/nova">
                  <Button size="sm">Cadastrar primeira empresa</Button>
                </Link>
              )
            }
          />
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nome', 'CNPJ', 'E-mail', 'Status', 'Ações'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-xfaint"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresasFiltradas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-6 py-3.5 font-medium text-ink">{empresa.nome}</td>
                  <td className="px-6 py-3.5 font-mono text-sm text-ink-muted">
                    {formatarCnpj(empresa.cnpj)}
                  </td>
                  <td className="px-6 py-3.5 text-ink-muted">{empresa.email}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={empresa.ativo ? 'success' : 'neutral'}>
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/empresas/${empresa.id}/funcionarios`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
                      >
                        <IconUsers />
                        Funcionários
                      </Link>
                      <Link
                        to={`/empresas/${empresa.id}`}
                        className="text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => toggleAtivo(empresa)}
                        className={`text-xs font-medium transition-colors ${
                          empresa.ativo
                            ? 'text-red-500 hover:text-red-700'
                            : 'text-emerald-600 hover:text-emerald-800'
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
      </Card>
    </div>
  )
}
