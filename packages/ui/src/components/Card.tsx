import * as React from 'react'

export function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`border-b border-gray-100 px-6 py-4 ${className}`}>{children}</div>
}

export function CardContent({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardFooter({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`border-t border-gray-100 px-6 py-4 ${className}`}>{children}</div>
}
