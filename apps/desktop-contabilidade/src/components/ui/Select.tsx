import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <select
      ref={ref}
      className={[
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition',
        'focus:border-brand focus:ring-2 focus:ring-brand/15',
        'disabled:bg-gray-50 disabled:text-gray-400',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'
