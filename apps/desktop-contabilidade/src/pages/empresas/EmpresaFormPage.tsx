import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  nome: string
  cnpj: string
  email: string
  senha: string
}

const VAZIO: FormData = { nome: '', cnpj: '', email: '', senha: '' }

export function EmpresaFormPage() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const ehEdicao = Boolean(empresaId)

  const [form, setForm] = useState<FormData>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(ehEdicao)

  useEffect(() => {
    if (!empresaId) return
    supabase
      .from('empresas')
      .select('nome, cnpj, email')
      .eq('id', empresaId)
      .single()
      .then(({ data }) => {
        if (data) setForm({ ...data, senha: '' })
        setCarregando(false)
      })
  }, [empresaId])

  function atualizar(campo: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    const cnpjLimpo = form.cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      setErro('CNPJ inválido. Informe os 14 dígitos.')
      setSalvando(false)
      return
    }

    if (ehEdicao) {
      // Edição: atualiza campos (senha só se preenchida)
      const update: Record<string, string> = { nome: form.nome, email: form.email }
      const { error } = await supabase.from('empresas').update(update).eq('id', empresaId!)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      // Criação: chama Edge Function que cria o auth user e a empresa
      if (!form.senha || form.senha.length < 8) {
        setErro('A senha deve ter pelo menos 8 caracteres.')
        setSalvando(false)
        return
      }
      const { error } = await supabase.functions.invoke('criar-empresa', {
        body: {
          tenant_id: tenantId,
          nome: form.nome,
          cnpj: cnpjLimpo,
          email: form.email,
          senha: form.senha,
        },
      })
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    navigate('/empresas')
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
      <div className="mb-6">
        <button
          onClick={() => navigate('/empresas')}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar para Empresas
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {ehEdicao ? 'Editar Empresa' : 'Nova Empresa'}
        </h1>
      </div>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-8">
        {erro && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Campo label="Razão Social / Nome" obrigatorio>
            <input
              type="text"
              value={form.nome}
              onChange={atualizar('nome')}
              placeholder="Empresa Alpha Ltda"
              required
              className={inputClass}
            />
          </Campo>

          <Campo label="CNPJ" obrigatorio={!ehEdicao}>
            <input
              type="text"
              value={form.cnpj}
              onChange={atualizar('cnpj')}
              placeholder="00.000.000/0000-00"
              required={!ehEdicao}
              disabled={ehEdicao}
              maxLength={18}
              className={`${inputClass} ${ehEdicao ? 'bg-gray-50 text-gray-400' : ''}`}
            />
          </Campo>

          <Campo label="E-mail de acesso" obrigatorio>
            <input
              type="email"
              value={form.email}
              onChange={atualizar('email')}
              placeholder="empresa@exemplo.com.br"
              required
              className={inputClass}
            />
          </Campo>

          {!ehEdicao && (
            <Campo label="Senha de acesso" obrigatorio>
              <input
                type="password"
                value={form.senha}
                onChange={atualizar('senha')}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400">
                A empresa usará esta senha + CNPJ para acessar o app.
              </p>
            </Campo>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : ehEdicao ? 'Salvar alterações' : 'Cadastrar empresa'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/empresas')}
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

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string
  obrigatorio?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
