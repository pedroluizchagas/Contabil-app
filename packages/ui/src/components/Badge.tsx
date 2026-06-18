import * as React from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

const variantClass: Record<Variant, string> = {
  default: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-gray-100 text-gray-600',
}

export function badgeVariants(variant: Variant = 'default') {
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass[variant]}`
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return <span className={`${badgeVariants(variant)} ${className}`}>{children}</span>
}
