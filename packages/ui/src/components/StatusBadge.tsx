import { Badge } from './Badge'
import type { StatusTenant, StatusSubscription } from '@contabhub/shared'

const tenantVariant: Record<StatusTenant, 'success' | 'warning' | 'error' | 'neutral' | 'info'> = {
  ativo: 'success', trial: 'info', inadimplente: 'error', inativo: 'neutral',
}

const tenantLabel: Record<StatusTenant, string> = {
  ativo: 'Ativo', trial: 'Trial', inadimplente: 'Inadimplente', inativo: 'Inativo',
}

const subVariant: Record<StatusSubscription, 'success' | 'warning' | 'error' | 'neutral' | 'info'> = {
  ativo: 'success', trial: 'info', inadimplente: 'error', cancelado: 'neutral',
}

const subLabel: Record<StatusSubscription, string> = {
  ativo: 'Ativo', trial: 'Trial', inadimplente: 'Inadimplente', cancelado: 'Cancelado',
}

export function StatusBadgeTenant({ status }: { status: StatusTenant }) {
  return <Badge variant={tenantVariant[status]}>{tenantLabel[status]}</Badge>
}

export function StatusBadgeSubscription({ status }: { status: StatusSubscription }) {
  return <Badge variant={subVariant[status]}>{subLabel[status]}</Badge>
}

// Re-export genérico para outros usos
export { StatusBadgeTenant as StatusBadge }
