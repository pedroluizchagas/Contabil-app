import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button, Campo, Card, Input, PageHeader } from '@/components/ui'

type Mensagem = { tipo: 'ok' | 'erro'; texto: string } | null

export function ContaPage() {
  const { empresa } = useAuth()
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')

  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgEmail, setMsgEmail] = useState<Mensagem>(null)
  const [msgSenha, setMsgSenha] = useState<Mensagem>(null)

  async function handleAtualizarEmail(e: FormEvent) {
    e.preventDefault()
    setMsgEmail(null)
    setSalvandoEmail(true)

    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    setSalvandoEmail(false)

    if (error) {
      setMsgEmail({ tipo: 'erro', texto: error.message })
    } else {
      setMsgEmail({ tipo: 'ok', texto: 'Verifique o novo e-mail para confirmar a alteração.' })
      setEmail('')
    }
  }

  async function handleAlterarSenha(e: FormEvent) {
    e.preventDefault()
    setMsgSenha(null)

    if (!empresa?.id) {
      setMsgSenha({ tipo: 'erro', texto: 'Sessão da empresa não carregada. Recarregue a página.' })
      return
    }
    if (novaSenha !== confirmaSenha) {
      setMsgSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' })
      return
    }
    if (novaSenha.length < 8) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha deve ter pelo menos 8 caracteres.' })
      return
    }

    setSalvandoSenha(true)

    // Altera via Edge Function para validar a senha atual antes
    const { data, error } = await supabase.functions.invoke<{ error?: string }>('alterar-senha-empresa', {
      body: {
        empresa_id: empresa.id,
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      },
    })

    setSalvandoSenha(false)

    if (error || data?.error) {
      setMsgSenha({ tipo: 'erro', texto: data?.error ?? error?.message ?? 'Erro ao alterar senha.' })
    } else {
      setMsgSenha({ tipo: 'ok', texto: 'Senha alterada com sucesso.' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
    }
  }

  return (
    <div className="p-8">
      <PageHeader titulo="Minha Conta" subtitulo="Informações da empresa e configurações de acesso" />

      {/* Dados da empresa (somente leitura) */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-semibold text-ink">Dados da Empresa</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="Razão Social" valor={empresa?.nome ?? '—'} />
          <InfoItem label="CNPJ" valor={formatarCnpj(empresa?.cnpj ?? '')} monoFont />
        </dl>
        <p className="mt-4 text-xs text-ink-faint">
          Para alterar dados cadastrais, entre em contato com sua contabilidade.
        </p>
      </Card>

      {/* Alterar e-mail */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-semibold text-ink">Alterar E-mail de Notificações</h2>

        <MensagemBox msg={msgEmail} />

        <form onSubmit={handleAtualizarEmail} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="novo@email.com.br"
              required
            />
          </div>
          <Button type="submit" size="lg" loading={salvandoEmail} disabled={salvandoEmail || !email}>
            {salvandoEmail ? 'Salvando...' : 'Atualizar'}
          </Button>
        </form>
      </Card>

      {/* Alterar senha */}
      <Card className="max-w-md p-6">
        <h2 className="mb-4 font-semibold text-ink">Alterar Senha de Acesso</h2>

        <MensagemBox msg={msgSenha} />

        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <Campo label="Senha atual" obrigatorio>
            <Input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </Campo>
          <Campo label="Nova senha" obrigatorio hint="Mínimo 8 caracteres">
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </Campo>
          <Campo label="Confirmar nova senha" obrigatorio>
            <Input
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              required
            />
          </Campo>
          <Button type="submit" size="lg" loading={salvandoSenha} disabled={salvandoSenha} className="w-full">
            {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function MensagemBox({ msg }: { msg: Mensagem }) {
  if (!msg) return null
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        msg.tipo === 'ok'
          ? 'border-brand-light bg-brand-muted text-brand-darker'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {msg.texto}
    </div>
  )
}

function InfoItem({ label, valor, monoFont }: { label: string; valor: string; monoFont?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-ink-faint">{label}</dt>
      <dd className={`mt-0.5 text-ink ${monoFont ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  )
}

function formatarCnpj(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14) return cnpj
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}
