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
import { Button, Badge, AlertaErro } from '@/components/ui'

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
      if (error) erro++
      else ok++
    }

    setImportando(false)
    setResultado({ ok, erro })
  }

  const validas = linhas.filter((l) => l.valida).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onFechar} />

      {/* Dialog */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Importar Funcionários via Excel</h2>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {resultado ? (
            /* ── Resultado ────────────────────────────────────────── */
            <div className="space-y-4 py-4 text-center">
              <p className="text-5xl">🎉</p>
              <p className="text-lg font-semibold text-gray-900">Importação concluída</p>
              <div className="flex justify-center gap-6 text-sm">
                <span className="font-medium text-emerald-600">
                  {resultado.ok} importados com sucesso
                </span>
                {resultado.erro > 0 && (
                  <span className="font-medium text-red-500">{resultado.erro} com erro</span>
                )}
              </div>
              <Button onClick={onConcluir} className="mt-2">
                Fechar
              </Button>
            </div>
          ) : linhas.length === 0 ? (
            /* ── Upload ───────────────────────────────────────────── */
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                  isDragActive
                    ? 'border-brand bg-brand-light'
                    : 'border-gray-200 hover:border-brand/50 hover:bg-brand-muted',
                ].join(' ')}
              >
                <input {...getInputProps()} />
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                  📊
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive
                    ? 'Solte o arquivo aqui'
                    : 'Arraste a planilha ou clique para selecionar'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Apenas arquivos .xlsx</p>
              </div>

              <AlertaErro mensagem={erroGeral} />

              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <p className="mb-1 font-medium text-gray-600">Colunas esperadas na planilha:</p>
                <p>Nome · CPF · Data Nascimento (DD/MM/AAAA ou AAAA-MM-DD) · Código · E-mail</p>
              </div>
            </div>
          ) : (
            /* ── Preview ──────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="success">{validas} válidos</Badge>
                  {linhas.length - validas > 0 && (
                    <Badge variant="error">{linhas.length - validas} com erro</Badge>
                  )}
                  <span className="text-gray-400">de {linhas.length} linhas</span>
                </div>
                <button
                  onClick={() => setLinhas([])}
                  className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-gray-100 bg-gray-50">
                    <tr>
                      {['Nome', 'CPF', 'Código', 'E-mail', 'Status'].map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 text-left font-medium text-gray-400 uppercase tracking-wide text-[10px]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((linha, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 ${!linha.valida ? 'bg-red-50/60' : 'hover:bg-gray-50/60'}`}
                      >
                        <td className="px-3 py-2">{linha.nome || '—'}</td>
                        <td className="px-3 py-2 font-mono">{linha.cpf || '—'}</td>
                        <td className="px-3 py-2">{linha.codigo || '—'}</td>
                        <td className="px-3 py-2">{linha.email || '—'}</td>
                        <td className="px-3 py-2">
                          {linha.valida ? (
                            <span className="font-medium text-emerald-600">✓ OK</span>
                          ) : (
                            <span
                              className="font-medium text-red-500"
                              title={linha.erros.join(', ')}
                            >
                              ✕ {linha.erros[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <Button onClick={importar} disabled={validas === 0} loading={importando}>
                  {importando
                    ? 'Importando...'
                    : `Importar ${validas} funcionário${validas !== 1 ? 's' : ''}`}
                </Button>
                <Button variant="secondary" onClick={onFechar}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Parsing e validação de linhas da planilha ────────────────────────────────

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
  const brMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
  const isoMatch = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return valor
  if (valor.includes('T')) return valor.split('T')[0]
  return ''
}
