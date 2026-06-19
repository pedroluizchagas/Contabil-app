'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type IconName = 'grid' | 'building' | 'list' | 'card'

function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' } as const
  switch (name) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'building':
      return (
        <svg {...common}>
          <path d="M2 16V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M1 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 8h2M10 8h2M6 11.5h2M10 11.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 16v-3h4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M6 4.5h10M6 9h10M6 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="2.5" cy="4.5" r="1" fill="currentColor" />
          <circle cx="2.5" cy="9" r="1" fill="currentColor" />
          <circle cx="2.5" cy="13.5" r="1" fill="currentColor" />
        </svg>
      )
    case 'card':
      return (
        <svg {...common}>
          <rect x="1.5" y="3.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1.5 7.5h15" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
  }
}

export function NavItem({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={[
        'group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive ? 'bg-brand text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
      ].join(' ')}
    >
      <Icon name={icon} />
      {label}
    </Link>
  )
}
