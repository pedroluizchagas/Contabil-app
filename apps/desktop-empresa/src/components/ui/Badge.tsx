import { type ReactNode } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'brand'

const variants: Record<BadgeVariant, string> = {
  brand: 'bg-brand-light text-brand-darker',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100  text-amber-700',
  error: 'bg-red-100    text-red-700',
  info: 'bg-blue-100   text-blue-700',
  neutral: 'bg-gray-100   text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
