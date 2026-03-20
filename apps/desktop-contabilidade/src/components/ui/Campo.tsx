import { type ReactNode } from 'react'

interface CampoProps {
  label: string
  obrigatorio?: boolean
  hint?: string
  erro?: string
  children: ReactNode
}

export function Campo({ label, obrigatorio, hint, erro, children }: CampoProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !erro && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      {erro && <p className="mt-1.5 text-xs text-red-500">{erro}</p>}
    </div>
  )
}
