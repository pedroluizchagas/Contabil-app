'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PlanoForm() {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [limitEmp, setLimitEmp] = useState('')
  const [limitFunc, setLimitFunc] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(false)
    setSalvando(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('planos') as any).insert({
      nome: nome.trim(),
      preco_mensal: parseFloat(preco.replace(',', '.')),
      limite_empresas: parseInt(limitEmp, 10),
      limite_funcionarios: parseInt(limitFunc, 10),
    })

    setSalvando(false)

    if (error) {
      setErro(error.message)
    } else {
      setOk(true)
      setNome('')
      setPreco('')
      setLimitEmp('')
      setLimitFunc('')
      router.refresh()
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 font-semibold text-gray-800">Criar novo plano</h2>

      {ok && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Plano criado com sucesso!
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Campo label="Nome do plano *">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Starter, Pro, Enterprise"
            required
            className={inputClass}
          />
        </Campo>

        <Campo label="Preço mensal (R$) *">
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="Ex: 97,00"
            required
            inputMode="decimal"
            className={inputClass}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Limite de empresas *">
            <input
              value={limitEmp}
              onChange={(e) => setLimitEmp(e.target.value)}
              type="number"
              min={1}
              required
              className={inputClass}
            />
          </Campo>
          <Campo label="Limite de funcionários *">
            <input
              value={limitFunc}
              onChange={(e) => setLimitFunc(e.target.value)}
              type="number"
              min={1}
              required
              className={inputClass}
            />
          </Campo>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Criando...' : 'Criar plano'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
