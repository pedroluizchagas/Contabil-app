import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card, CardContent, Campo, AlertaErro, PageHeader, Input } from '@/components/ui'

interface FormData {
  nome: string
  cnpj: string
  email: string
  senha: string
}

const VAZIO: FormData = { nome: '', cnpj: '', email: '', senha: '' }

export function EmpresaFormPage() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const { getAccessToken } = useAuth()
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
      const { error } = await supabase
        .from('empresas')
        .update({ nome: form.nome, email: form.email })
        .eq('id', empresaId!)
      if (error) {
        setErro(error.message)
        setSalvando(false)
        return
      }
    } else {
      if (!form.senha || form.senha.length < 8) {
        setErro('A senha deve ter pelo menos 8 caracteres.')
        setSalvando(false)
        return
      }

      // Renova o token antes de chamar a Edge Function.
      // getAccessToken faz logout automático se o refresh falhar (ex: supabase db reset).
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setErro('Sessão expirada. Faça login novamente.')
        setSalvando(false)
        return
      }
      // tenant_id é derivado pelo servidor a partir do JWT — não enviamos no body.
      const { error } = await supabase.functions.invoke('criar-empresa', {
        body: { nome: form.nome, cnpj: cnpjLimpo, email: form.email, senha: form.senha },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (error) {
        let mensagem = error.message
        try {
          const body = await (error as { context?: Response }).context?.json()
          console.error('[criar-empresa] error body:', body)
          if (body?.error) mensagem = body.error
        } catch (parseErr) {
          console.error(
            '[criar-empresa] falha ao ler body:',
            parseErr,
            'context:',
            (error as { context?: Response }).context
          )
        }
        setErro(mensagem)
        setSalvando(false)
        return
      }
    }

    navigate('/empresas')
  }

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        titulo={ehEdicao ? 'Editar Empresa' : 'Nova Empresa'}
        voltar="/empresas"
        voltarLabel="Empresas"
      />

      <Card className="max-w-lg">
        <CardContent>
          <AlertaErro mensagem={erro} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <Campo label="Razão Social / Nome" obrigatorio>
              <Input
                type="text"
                value={form.nome}
                onChange={atualizar('nome')}
                placeholder="Empresa Alpha Ltda"
                required
              />
            </Campo>

            <Campo label="CNPJ" obrigatorio={!ehEdicao}>
              <Input
                type="text"
                value={form.cnpj}
                onChange={atualizar('cnpj')}
                placeholder="00.000.000/0000-00"
                required={!ehEdicao}
                disabled={ehEdicao}
                maxLength={18}
              />
            </Campo>

            <Campo label="E-mail de acesso" obrigatorio>
              <Input
                type="email"
                value={form.email}
                onChange={atualizar('email')}
                placeholder="empresa@exemplo.com.br"
                required
              />
            </Campo>

            {!ehEdicao && (
              <Campo
                label="Senha de acesso"
                obrigatorio
                hint="A empresa usa esta senha + CNPJ para acessar o app."
              >
                <Input
                  type="password"
                  value={form.senha}
                  onChange={atualizar('senha')}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </Campo>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={salvando}>
                {salvando ? 'Salvando...' : ehEdicao ? 'Salvar alterações' : 'Cadastrar empresa'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/empresas')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
