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

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}

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
      setErro('CNPJ invalido. Informe os 14 digitos.')
      setSalvando(false)
      return
    }

    if (ehEdicao) {
      const update: Record<string, string> = { nome: form.nome, email: form.email }
      const { error } = await supabase.from('empresas').update(update).eq('id', empresaId!)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
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
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* Top Bar */}
      <div>
        <button
          onClick={() => navigate('/empresas')}
          className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink"
        >
          <IconArrowLeft />
          Voltar para Empresas
        </button>
        <h1 className="text-[24px] font-bold leading-tight text-ink">
          {ehEdicao ? 'Editar Empresa' : 'Nova Empresa'}
        </h1>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          {ehEdicao
            ? 'Atualize os dados cadastrais da empresa'
            : 'Preencha os dados para cadastrar uma nova empresa cliente'}
        </p>
      </div>

      {/* Card do formulario */}
      <div className="max-w-lg rounded-card bg-card p-8 shadow-card">

        {erro && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-danger">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <Campo label="Razao Social / Nome" obrigatorio>
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
              className={`${inputClass} ${ehEdicao ? 'cursor-not-allowed bg-[#f9f9f9] text-ink-xfaint' : ''}`}
            />
            {ehEdicao && (
              <p className="mt-1 text-[11px] text-ink-xfaint">
                O CNPJ nao pode ser alterado apos o cadastro.
              </p>
            )}
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
                placeholder="Minimo 8 caracteres"
                required
                minLength={8}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-ink-xfaint">
                A empresa usara esta senha junto com o CNPJ para acessar o app.
              </p>
            </Campo>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : ehEdicao ? 'Salvar alteracoes' : 'Cadastrar empresa'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/empresas')}
              className="rounded-lg border border-[#e0e0e0] px-5 py-2.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-[#f9f9f9] hover:text-ink"
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
  'w-full rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[12.5px] text-ink placeholder-ink-xfaint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-muted'

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
      <label className="mb-1.5 block text-[12px] font-medium text-ink">
        {label}
        {obrigatorio && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
    </div>
  )
}
