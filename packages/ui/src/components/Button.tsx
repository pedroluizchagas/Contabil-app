import * as React from 'react'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  default:     'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
  outline:     'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
  ghost:       'text-gray-700 hover:bg-gray-100 border-transparent bg-transparent',
  destructive: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
}

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function buttonVariants({ variant = 'default', size = 'md' }: Pick<ButtonProps, 'variant' | 'size'> = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors border
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variantClass[variant]} ${sizeClass[size]}`
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${buttonVariants({ variant, size })} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
