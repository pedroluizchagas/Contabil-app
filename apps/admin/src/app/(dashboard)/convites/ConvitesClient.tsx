'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { criarConvite, atualizarConvite, provisionarConvite } from './actions'

type StatusConvite = 'lead' | 'contatado' | 'aprovado' | 'ativo' | 'recusado'

interface Plano {
  id: string
  nome: string
  stripe_price_id: string | null
}

interface Convite {
  id: string
  nome: string
  cnpj: string | null
  email: string
  plano_id: string | null
  status: StatusConvite
  notas: string | null
  tenant_id: string | null
  created_at: string
}

const STATUS_FLUXO: StatusConvite[] = ['lead', 'contatado', 'aprovado', 'ativo', 'recusado']

const STATUS_ESTILO: Record<StatusConvite, string> = {
  lead: 'bg-gray-100 text-gray-600',
  contatado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-amber-100 text-amber-700',
  ativo: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
}

export function ConvitesClient({ convites, planos }: { convites: Convite[]; planos: Plano[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ListaConvites convites={convites} planos={planos} />
      </div>
      <div>
        <NovoConviteForm planos={planos} />
      </div>
    </div>
  )
}

function ListaConvites({ convites, planos }: { convites: Convite[]; planos: Plano[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-800">Funil de contabilidades</h2>
        <p className="text-xs text-gray-500">
          {convites.length} convite{convites.length !== 1 ? 's' : ''} · onboarding fechado
        </p>
      </div>
      {convites.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">Nenhum convite ainda.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {convites.map((c) => (
            <ConviteRow key={c.id} convite={c} planos={planos} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ConviteRow({ convite, planos }: { convite: Convite; planos: Plano[] }) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const plano = planos.find((p) => p.id === convite.plano_id)
  const podeProvisionar = convite.status === 'aprovado' && !convite.tenant_id && !!convite.plano_id

  function mudarStatus(status: StatusConvite) {
    setErro(null)
    startTransition(async () => {
      const r = await atualizarConvite(convite.id, { status })
      if (r.error) setErro(r.error)
    })
  }

  function mudarPlano(plano_id: string) {
    setErro(null)
    startTransition(async () => {
      const r = await atualizarConvite(convite.id, { plano_id: plano_id || null })
      if (r.error) setErro(r.error)
    })
  }

  function provisionar() {
    setErro(null)
    startTransition(async () => {
      const r = await provisionarConvite(convite.id)
      if (r.error) setErro(r.error)
    })
  }

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{convite.nome}</p>
          <p className="text-xs text-gray-400">
            {convite.email}
            {convite.cnpj ? ` · ${convite.cnpj}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_ESTILO[convite.status]}`}
        >
          {convite.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={convite.status}
          disabled={pending || convite.status === 'ativo'}
          onChange={(e) => mudarStatus(e.target.value as StatusConvite)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-violet-500 disabled:opacity-50"
        >
          {STATUS_FLUXO.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={convite.plano_id ?? ''}
          disabled={pending || convite.status === 'ativo'}
          onChange={(e) => mudarPlano(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-violet-500 disabled:opacity-50"
        >
          <option value="">Sem plano</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
              {p.stripe_price_id ? '' : ' (sem price)'}
            </option>
          ))}
        </select>

        {podeProvisionar && (
          <button
            onClick={provisionar}
            disabled={pending}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {pending ? 'Provisionando…' : 'Provisionar'}
          </button>
        )}

        {convite.tenant_id && <span className="text-xs text-green-600">✓ Tenant criado</span>}
      </div>

      {plano && !plano.stripe_price_id && convite.status === 'aprovado' && (
        <p className="mt-2 text-xs text-amber-600">
          O plano selecionado não tem <code>stripe_price_id</code> — configure-o antes de
          provisionar.
        </p>
      )}
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </li>
  )
}

function NovoConviteForm({ planos }: { planos: Plano[] }) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setOk(false)
    const form = e.currentTarget
    const dados = new FormData(form)
    startTransition(async () => {
      const r = await criarConvite(dados)
      if (r.error) setErro(r.error)
      else {
        setOk(true)
        form.reset()
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-gray-800">Novo convite</h2>
      <p className="mb-4 text-xs text-gray-500">Registre uma contabilidade interessada.</p>

      {ok && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Convite registrado!
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="nome" placeholder="Nome da contabilidade *" required className={inputClass} />
        <input name="email" type="email" placeholder="E-mail *" required className={inputClass} />
        <input name="cnpj" placeholder="CNPJ" className={inputClass} />
        <select name="plano_id" defaultValue="" className={inputClass}>
          <option value="">Plano (opcional)</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <textarea
          name="notas"
          placeholder="Notas da qualificação"
          rows={3}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Registrar convite'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
