import { type ReactNode } from 'react'

interface EmptyStateProps {
  icone?: ReactNode
  titulo: string
  descricao?: string
  acao?: ReactNode
}

export function EmptyState({ icone, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icone && <div className="mb-4 text-4xl opacity-60">{icone}</div>}
      <p className="text-sm font-medium text-ink-muted">{titulo}</p>
      {descricao && <p className="mt-1 text-sm text-ink-faint">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}
