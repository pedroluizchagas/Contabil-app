import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, className = '', ...props }, ref) => (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={[
          'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900',
          'placeholder-gray-400 outline-none transition',
          'focus:border-brand focus:ring-2 focus:ring-brand/15',
          'disabled:bg-gray-50 disabled:text-gray-400',
          leftIcon ? 'pl-9' : '',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  ),
)
Input.displayName = 'Input'
