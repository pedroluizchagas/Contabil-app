import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

  const filtrados = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      f.email.toLowerCase().includes(busca.toLowerCase())
  )

  const ativos = funcionarios.filter((f) => f.ativo).length

  return (
    <div className="p-8">
      <PageHeader
        titulo="Funcionários"
        subtitulo={`${empresaNome} · ${ativos} ativos de ${funcionarios.length}`}
        voltar="/empresas"
        voltarLabel="Empresas"
        acao={
          <>
            <Button variant="secondary" onClick={() => setMostrarImportacao(true)}>
              Importar Excel
            </Button>
            <Link
              to={`/empresas/${empresaId}/funcionarios/novo`}
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
              Novo Funcionário
            </Link>
          </>
        }
      />

      {/* Busca */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, código ou e-mail..."
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
      </div>

      {/* Tabela */}
      <Card>
        {carregando ? (
          <PageSpinner />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icone="👤"
            titulo={
              busca ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado ainda.'
            }
            acao={
              !busca && (
                <Link to={`/empresas/${empresaId}/funcionarios/novo`}>
                  <Button size="sm">Cadastrar primeiro funcionário</Button>
                </Link>
              )
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nome', 'Código', 'E-mail', 'Status', 'Ações'].map((col) => (
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
              {filtrados.map((func) => (
                <tr
                  key={func.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-6 py-3.5 font-medium text-ink">{func.nome}</td>
                  <td className="px-6 py-3.5 font-mono text-sm text-ink-muted">{func.codigo}</td>
                  <td className="px-6 py-3.5 text-ink-muted">{func.email}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={func.ativo ? 'success' : 'neutral'}>
                      {func.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/empresas/${empresaId}/funcionarios/${func.id}`}
                        className="text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => toggleAtivo(func)}
                        className={`text-xs font-medium transition-colors ${
                          func.ativo
                            ? 'text-red-500 hover:text-red-700'
                            : 'text-emerald-600 hover:text-emerald-800'
                        }`}
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
      </Card>

      {mostrarImportacao && (
        <ImportacaoExcel
          empresaId={empresaId!}
          onFechar={() => setMostrarImportacao(false)}
          onConcluir={() => {
            setMostrarImportacao(false)
            carregarFuncionarios()
          }}
        />
      )}
    </div>
  )
}
