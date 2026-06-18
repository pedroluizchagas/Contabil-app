interface AlertaErroProps {
  mensagem: string | null
}

export function AlertaErro({ mensagem }: AlertaErroProps) {
  if (!mensagem) return null
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span className="mt-0.5 shrink-0">⚠</span>
      <span>{mensagem}</span>
    </div>
  )
}
