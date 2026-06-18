import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function ContaPage() {
  const { empresa } = useAuth()
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')

  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgEmail, setMsgEmail] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

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
    const { data, error } = await supabase.functions.invoke<{ error?: string }>(
      'alterar-senha-empresa',
      {
        body: {
          empresa_id: empresa?.id,
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        },
      }
    )

    setSalvandoSenha(false)

    if (error || data?.error) {
      setMsgSenha({ tipo: 'erro', texto: data?.error ?? 'Erro ao alterar senha.' })
    } else {
      setMsgSenha({ tipo: 'ok', texto: 'Senha alterada com sucesso.' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
        <p className="text-sm text-gray-500">Informações da empresa e configurações de acesso</p>
      </div>

      {/* Dados da empresa (somente leitura) */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-800">Dados da Empresa</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="Razão Social" valor={empresa?.nome ?? '—'} />
          <InfoItem label="CNPJ" valor={formatarCnpj(empresa?.cnpj ?? '')} monoFont />
        </dl>
        <p className="mt-4 text-xs text-gray-400">
          Para alterar dados cadastrais, entre em contato com sua contabilidade.
        </p>
      </div>

      {/* Alterar e-mail */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-800">Alterar E-mail de Notificações</h2>

        {msgEmail && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
              msgEmail.tipo === 'ok'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {msgEmail.texto}
          </div>
        )}

        <form onSubmit={handleAtualizarEmail} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="novo@email.com.br"
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={salvandoEmail || !email}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {salvandoEmail ? 'Salvando...' : 'Atualizar'}
          </button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-800">Alterar Senha de Acesso</h2>

        {msgSenha && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
              msgSenha.tipo === 'ok'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {msgSenha.texto}
          </div>
        )}

        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <Campo label="Senha atual">
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              className={inputClass}
            />
          </Campo>
          <Campo label="Nova senha">
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
            />
          </Campo>
          <Campo label="Confirmar nova senha">
            <input
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              required
              className={inputClass}
            />
          </Campo>
          <button
            type="submit"
            disabled={salvandoSenha}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function InfoItem({
  label,
  valor,
  monoFont,
}: {
  label: string
  valor: string
  monoFont?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className={`mt-0.5 text-gray-900 ${monoFont ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  )
}

function formatarCnpj(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14) return cnpj
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}
