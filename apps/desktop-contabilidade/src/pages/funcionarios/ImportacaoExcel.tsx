/**
 * Modal de importação de funcionários via planilha Excel (.xlsx).
 *
 * Colunas esperadas na planilha (nomes flexíveis):
 *   Nome | CPF | Data Nascimento | Código | E-mail
 *
 * Fluxo:
 *   1. Usuário seleciona o arquivo
 *   2. Sistema exibe preview dos dados
 *   3. Usuário confirma → sistema cria os funcionários via Edge Function
 */

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface LinhaPreview {
  nome: string
  cpf: string
  data_nascimento: string
  codigo: string
  email: string
  valida: boolean
  erros: string[]
}

interface Props {
  empresaId: string
  onFechar: () => void
  onConcluir: () => void
}

export function ImportacaoExcel({ empresaId, onFechar, onConcluir }: Props) {
  const { tenantId } = useAuth()
  const [linhas, setLinhas] = useState<LinhaPreview[]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; erro: number } | null>(null)
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const onDrop = useCallback((arquivos: File[]) => {
    const arquivo = arquivos[0]
    if (!arquivo) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const dados = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(dados, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        setLinhas(rows.map(parsearLinha))
        setErroGeral(null)
      } catch {
        setErroGeral('Não foi possível ler o arquivo. Verifique se é um .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(arquivo)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false,
  })

  async function importar() {
    const validas = linhas.filter((l) => l.valida)
    if (!validas.length) return

    setImportando(true)
    let ok = 0
    let erro = 0

    for (const linha of validas) {
      const { error } = await supabase.functions.invoke('criar-funcionario', {
        body: {
          tenant_id: tenantId,
          empresa_id: empresaId,
          nome: linha.nome,
          cpf: linha.cpf.replace(/\D/g, ''),
          data_nascimento: linha.data_nascimento,
          codigo: linha.codigo.toUpperCase().trim(),
          email: linha.email,
        },
      })
      if (error) erro++; else ok++
    }

    setImportando(false)
    setResultado({ ok, erro })
  }

  const validas = linhas.filter((l) => l.valida).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Importar Funcionários via Excel</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {resultado ? (
            // ── Resultado da importação ─────────────────────────────────────
            <div className="space-y-4 text-center">
              <p className="text-4xl">🎉</p>
              <p className="text-lg font-semibold text-gray-900">Importação concluída</p>
              <div className="flex justify-center gap-6 text-sm">
                <span className="text-green-600">{resultado.ok} importados com sucesso</span>
                {resultado.erro > 0 && <span className="text-red-500">{resultado.erro} com erro</span>}
              </div>
              <button
                onClick={onConcluir}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          ) : linhas.length === 0 ? (
            // ── Upload da planilha ──────────────────────────────────────────
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste a planilha ou clique para selecionar'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Apenas arquivos .xlsx</p>
              </div>

              {erroGeral && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {erroGeral}
                </p>
              )}

              <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <p className="font-medium mb-1">Colunas esperadas na planilha:</p>
                <p>Nome | CPF | Data Nascimento (DD/MM/AAAA ou AAAA-MM-DD) | Código | E-mail</p>
              </div>
            </div>
          ) : (
            // ── Preview dos dados ───────────────────────────────────────────
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-green-600">{validas} válidos</span>
                  {linhas.length - validas > 0 && (
                    <span className="ml-2 text-red-500">{linhas.length - validas} com erro</span>
                  )}
                  {' '}de {linhas.length} linhas
                </p>
                <button
                  onClick={() => setLinhas([])}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left font-medium text-gray-500">
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">CPF</th>
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2">E-mail</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((linha, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${!linha.valida ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-1.5">{linha.nome || '—'}</td>
                        <td className="px-3 py-1.5 font-mono">{linha.cpf || '—'}</td>
                        <td className="px-3 py-1.5">{linha.codigo || '—'}</td>
                        <td className="px-3 py-1.5">{linha.email || '—'}</td>
                        <td className="px-3 py-1.5">
                          {linha.valida ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-500" title={linha.erros.join(', ')}>✕ {linha.erros[0]}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={importar}
                  disabled={validas === 0 || importando}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {importando ? 'Importando...' : `Importar ${validas} funcionário${validas !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={onFechar}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Parsing e validação de linhas da planilha ─────────────────────────────────

function parsearLinha(row: Record<string, unknown>): LinhaPreview {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]
      if (val !== undefined && val !== '') return String(val).trim()
    }
    return ''
  }

  const nome = get(['Nome', 'NOME', 'name'])
  const cpf = get(['CPF', 'cpf'])
  const rawData = get(['Data Nascimento', 'DataNascimento', 'data_nascimento', 'Nascimento'])
  const codigo = get(['Código', 'Codigo', 'CODIGO', 'codigo', 'Matricula', 'Matrícula'])
  const email = get(['E-mail', 'Email', 'EMAIL', 'email'])

  const data_nascimento = normalizarData(rawData)
  const erros: string[] = []

  if (!nome) erros.push('Nome obrigatório')
  if (!cpf || cpf.replace(/\D/g, '').length !== 11) erros.push('CPF inválido')
  if (!data_nascimento) erros.push('Data de nascimento inválida')
  if (!codigo) erros.push('Código obrigatório')
  if (!email || !email.includes('@')) erros.push('E-mail inválido')

  return { nome, cpf, data_nascimento, codigo, email, valida: erros.length === 0, erros }
}

function normalizarData(valor: string): string {
  if (!valor) return ''
  // Tenta DD/MM/AAAA
  const brMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
  // Tenta AAAA-MM-DD
  const isoMatch = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return valor
  // Tenta Date object serializado
  if (valor.includes('T')) return valor.split('T')[0]
  return ''
}
