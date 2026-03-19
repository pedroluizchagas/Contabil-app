// Lógica de negócio compartilhada — ContaHub
// Utilizada por todos os apps do monorepo.

// ─── Formatadores ─────────────────────────────────────────────────────────────

export function formatarCnpj(cnpj: string): string {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14) return cnpj
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

export function formatarCpf(cpf: string): string {
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

export function formatarMoeda(valor: number, moeda = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor)
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function formatarMesAno(mes: number, ano: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[mes - 1]}/${ano}`
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validarCnpj(cnpj: string): boolean {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false
  const peso = (digits: number[], base: number) =>
    digits.reduce((acc, d, i) => acc + d * (base - i), 0)
  const d1 = (peso(s.slice(0, 12).split('').map(Number), 5 + 7) * 10) % 11
  const d2 = (peso(s.slice(0, 13).split('').map(Number), 6 + 7) * 10) % 11
  return (d1 < 2 ? 0 : 11 - d1) === Number(s[12]) &&
    (d2 < 2 ? 0 : 11 - d2) === Number(s[13])
}

export function validarCpf(cpf: string): boolean {
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false
  const soma = (digits: number[], peso: number) =>
    digits.reduce((acc, d, i) => acc + d * (peso - i), 0)
  const d1 = (soma(s.slice(0, 9).split('').map(Number), 10) * 10) % 11 % 10
  const d2 = (soma(s.slice(0, 10).split('').map(Number), 11) * 10) % 11 % 10
  return d1 === Number(s[9]) && d2 === Number(s[10])
}

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export type StatusTenant = 'ativo' | 'inativo' | 'trial' | 'inadimplente'
export type StatusSubscription = 'trial' | 'ativo' | 'inadimplente' | 'cancelado'
export type TipoDocumento = 'holerite' | 'ferias'
export type StatusLote = 'aguardando' | 'processando' | 'concluido' | 'erro'
export type TipoEvento = 'visualizado' | 'assinado'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const MESES_ABREV = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const
export const MESES_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const

export const STATUS_TENANT_LABEL: Record<StatusTenant, string> = {
  ativo: 'Ativo', inativo: 'Inativo', trial: 'Trial', inadimplente: 'Inadimplente',
}

export const STATUS_SUBSCRIPTION_LABEL: Record<StatusSubscription, string> = {
  trial: 'Trial', ativo: 'Ativo', inadimplente: 'Inadimplente', cancelado: 'Cancelado',
}
