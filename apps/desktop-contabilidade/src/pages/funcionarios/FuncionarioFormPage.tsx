import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  nome: string
  cpf: string
  data_nascimento: string
  codigo: string
  email: string
}

const VAZIO: FormData = { nome: '', cpf: '', data_nascimento: '', codigo: '', email: '' }

export function FuncionarioFormPage() {
  const { empresaId, funcId } = useParams<{ empresaId: string; funcId: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const ehEdicao = Boolean(funcId)

  const [form, setForm] = useState<FormData>(VAZIO)
  const [empresaNome, setEmpresaNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.from('empresas').select('nome').eq('id', empresaId!).single()
      .then(({ data }) => { if (data) setEmpresaNome(data.nome) })

    if (funcId) {
      supabase.from('funcionarios').select('nome, codigo, email').eq('id', funcId).single()
        .then(({ data }) => {
          if (data) setForm({ ...VAZIO, nome: data.nome, codigo: data.codigo, email: data.email })
          setCarregando(false)
        })
    } else {
      setCarregando(false)
    }
  }, [empresaId, funcId])

  function atualizar(campo: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    if (ehEdicao) {
      const { error } = await supabase
        .from('funcionarios')
        .update({ nome: form.nome, email: form.email })
        .eq('id', funcId!)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      const cpfLimpo = form.cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        setErro('CPF inválido. Informe os 11 dígitos.')
        setSalvando(false)
        return
      }

      // Cria funcionário via Edge Function (que faz o hash do CPF/data_nascimento)
      const { error } = await supabase.functions.invoke('criar-funcionario', {
        body: {
          tenant_id: tenantId,
          empresa_id: empresaId,
          nome: form.nome,
          cpf: cpfLimpo,
          data_nascimento: form.data_nascimento,
          codigo: form.codigo.toUpperCase().trim(),
          email: form.email,
        },
      })
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    navigate(`/empresas/${empresaId}/funcionarios`)
  }

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-2">
        <button
          onClick={() => navigate(`/empresas/${empresaId}/funcionarios`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Funcionários de {empresaNome}
        </button>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {ehEdicao ? 'Editar Funcionário' : 'Novo Funcionário'}
      </h1>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-8">
        {erro && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Campo label="Nome completo" obrigatorio>
            <input type="text" value={form.nome} onChange={atualizar('nome')} required className={inputClass} />
          </Campo>

          {!ehEdicao && (
            <>
              <Campo label="CPF" obrigatorio>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={atualizar('cpf')}
                  placeholder="000.000.000-00"
                  required
                  maxLength={14}
                  className={inputClass}
                />
              </Campo>

              <Campo label="Data de nascimento" obrigatorio>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={atualizar('data_nascimento')}
                  required
                  className={inputClass}
                />
              </Campo>
            </>
          )}

          <Campo label="Código no software contábil" obrigatorio>
            <input
              type="text"
              value={form.codigo}
              onChange={atualizar('codigo')}
              placeholder="Ex.: ALPHA001"
              required
              disabled={ehEdicao}
              className={`${inputClass} ${ehEdicao ? 'bg-gray-50 text-gray-400' : ''} uppercase`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Deve coincidir com o código que aparece no PDF de holerites.
            </p>
          </Campo>

          <Campo label="E-mail" obrigatorio>
            <input type="email" value={form.email} onChange={atualizar('email')} required className={inputClass} />
          </Campo>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : ehEdicao ? 'Salvar alterações' : 'Cadastrar funcionário'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/empresas/${empresaId}/funcionarios`)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function Campo({ label, obrigatorio, children }: { label: string; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}{obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
