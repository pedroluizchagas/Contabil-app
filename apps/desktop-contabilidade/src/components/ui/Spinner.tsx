interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand border-t-transparent ${sizes[size]} ${className}`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
