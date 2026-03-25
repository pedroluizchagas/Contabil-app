import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  voltar?: string
  voltarLabel?: string
  acao?: ReactNode
}

export function PageHeader({ titulo, subtitulo, voltar, voltarLabel = 'Voltar', acao }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-7">
      {voltar && (
        <button
          onClick={() => navigate(voltar)}
          className="mb-3 flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 11L4.5 7L8.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {voltarLabel}
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-ink-muted">{subtitulo}</p>}
        </div>
        {acao && <div className="flex shrink-0 items-center gap-2">{acao}</div>}
      </div>
    </div>
  )
}
