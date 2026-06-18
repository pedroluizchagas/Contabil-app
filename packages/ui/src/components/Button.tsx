import * as React from 'react'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  default: 'bg-[#7ED321] text-[#111] hover:opacity-90 border-transparent',
  outline: 'border border-[#e0e0e0] text-[#1A1A1A] hover:bg-[#f5f5f5] bg-white',
  ghost: 'text-[#555] hover:text-[#1A1A1A] hover:bg-[#f0f0f0] border-transparent bg-transparent',
  destructive: 'bg-[#E84444] text-white hover:opacity-90 border-transparent',
}

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-[12.5px]',
  lg: 'px-5 py-2.5 text-[14px]',
}

export function buttonVariants({
  variant = 'default',
  size = 'md',
}: Pick<ButtonProps, 'variant' | 'size'> = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all border
    focus:outline-none focus:ring-2 focus:ring-[#7ED321] focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variantClass[variant]} ${sizeClass[size]}`
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'default', size = 'md', loading, className = '', children, disabled, ...props },
    ref
  ) => (
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
