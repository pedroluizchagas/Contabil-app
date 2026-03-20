import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ' +
  'disabled:pointer-events-none disabled:opacity-50 select-none'

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'bg-brand text-white hover:bg-brand-dark active:bg-brand-darker',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
  outline:   'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger:    'bg-red-600 text-white hover:bg-red-700',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8  px-3 text-xs',
  md: 'h-9  px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, children, disabled, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
