import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card, CardContent, Campo, AlertaErro, PageHeader, Input } from '@/components/ui'

/* ── Section wrapper ─────────────────────────────────────────────── */
function Section({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-3 gap-8">
      <div>
        <p className="text-sm font-semibold text-ink">{titulo}</p>
        <p className="mt-1 text-sm text-ink-muted">{descricao}</p>
      </div>
      <div className="col-span-2">
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export function ConfiguracoesPage() {
  const { user } = useAuth()
  const email = user?.email ?? ''
  const nomeAtual = (user?.user_metadata?.full_name as string | undefined) ?? ''

  /* Perfil */
  const [nome, setNome] = useState(nomeAtual)
  const [salvarNome, setSalvarNome] = useState(false)
  const [erroNome, setErroNome] = useState<string | null>(null)
  const [sucessoNome, setSucessoNome] = useState(false)

  /* Senha */
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvarSenha, setSalvarSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [sucessoSenha, setSucessoSenha] = useState(false)

  /* Iniciais do avatar */
  const exibicao = nome.trim() || email
  const iniciais = exibicao
    .split(/[\s@]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  /* ── Salvar nome ─────────────────────────────────────────────── */
  async function handleSalvarNome(e: FormEvent) {
    e.preventDefault()
    setErroNome(null)
    setSucessoNome(false)
    if (!nome.trim()) {
      setErroNome('O nome não pode ficar em branco.')
      return
    }
    setSalvarNome(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome.trim() } })
    setSalvarNome(false)
    if (error) setErroNome(error.message)
    else setSucessoNome(true)
  }

  /* ── Alterar senha ───────────────────────────────────────────── */
  async function handleAlterarSenha(e: FormEvent) {
    e.preventDefault()
    setErroSenha(null)
    setSucessoSenha(false)

    if (novaSenha.length < 8) {
      setErroSenha('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }

    setSalvarSenha(true)
    /* Supabase requer reautenticação via re-signin antes de updateUser com password */
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    })
    if (loginErr) {
      setErroSenha('Senha atual incorreta.')
      setSalvarSenha(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvarSenha(false)
    if (error) setErroSenha(error.message)
    else {
      setSucessoSenha(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    }
  }

  return (
    <div className="p-8">
      <PageHeader titulo="Configurações" subtitulo="Gerencie seu perfil e preferências de conta" />

      <div className="max-w-3xl space-y-10">
        {/* ── Perfil ──────────────────────────────────────────────── */}
        <Section titulo="Perfil" descricao="Informações que identificam sua conta no sistema.">
          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ background: '#7DC82E' }}
            >
              {iniciais}
            </div>
            <div>
              <p className="font-medium text-ink">{nome.trim() || email}</p>
              <p className="text-sm text-ink-faint">{email}</p>
            </div>
          </div>

          <AlertaErro mensagem={erroNome} />
          {sucessoNome && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Nome atualizado com sucesso.
            </div>
          )}

          <form onSubmit={handleSalvarNome} className="space-y-4">
            <Campo label="Nome de exibição" obrigatorio>
              <Input
                type="text"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  setSucessoNome(false)
                }}
                placeholder="Seu nome completo"
              />
            </Campo>

            <Campo label="E-mail">
              <Input type="email" value={email} disabled className="cursor-not-allowed" />
            </Campo>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={salvarNome} size="sm">
                Salvar alterações
              </Button>
            </div>
          </form>
        </Section>

        {/* Divisor */}
        <hr className="border-gray-100" />

        {/* ── Segurança ────────────────────────────────────────────── */}
        <Section titulo="Segurança" descricao="Mantenha sua conta protegida com uma senha forte.">
          <AlertaErro mensagem={erroSenha} />
          {sucessoSenha && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Senha alterada com sucesso.
            </div>
          )}

          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <Campo label="Senha atual" obrigatorio>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => {
                  setSenhaAtual(e.target.value)
                  setSucessoSenha(false)
                }}
                placeholder="••••••••"
                required
              />
            </Campo>

            <Campo label="Nova senha" obrigatorio hint="Mínimo de 8 caracteres.">
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => {
                  setNovaSenha(e.target.value)
                  setSucessoSenha(false)
                }}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </Campo>

            <Campo label="Confirmar nova senha" obrigatorio>
              <Input
                type="password"
                value={confirmarSenha}
                onChange={(e) => {
                  setConfirmarSenha(e.target.value)
                  setSucessoSenha(false)
                }}
                placeholder="••••••••"
                required
              />
            </Campo>

            <Button type="submit" loading={salvarSenha} size="sm">
              Alterar senha
            </Button>
          </form>
        </Section>

        {/* Divisor */}
        <hr className="border-gray-100" />

        {/* ── Plano ────────────────────────────────────────────────── */}
        <Section titulo="Plano atual" descricao="Detalhes da sua assinatura ContaHub.">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand">
                  Profissional
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                Até 50 empresas · Funcionários ilimitados · Suporte prioritário
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled>
              Gerenciar plano
            </Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
