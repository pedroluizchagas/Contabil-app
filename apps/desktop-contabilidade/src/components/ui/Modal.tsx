import { type ReactNode } from 'react'

const larguras = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

interface ModalProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
  largura?: keyof typeof larguras
}

export function Modal({ aberto, onFechar, titulo, children, largura = 'md' }: ModalProps) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      {/* Dialog */}
      <div className={`relative w-full ${larguras[largura]} rounded-2xl bg-white shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
