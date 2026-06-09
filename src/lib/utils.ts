export function cn(...inputs: (string | undefined | null | false | 0)[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en').format(n)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getTrendClass(trend: number): string {
  if (trend > 0) return 'text-success'
  if (trend < 0) return 'text-danger'
  return 'text-text-secondary'
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-warning bg-warning/10',
    confirmed: 'text-info bg-info/10',
    preparing: 'text-brand-400 bg-brand-400/10',
    ready: 'text-success bg-success/10',
    delivered: 'text-success bg-success/10',
    cancelled: 'text-danger bg-danger/10',
    refunded: 'text-text-muted bg-text-muted/10',
    active: 'text-success bg-success/10',
    inactive: 'text-danger bg-danger/10',
    open: 'text-success bg-success/10',
    closed: 'text-text-muted bg-text-muted/10',
  }
  return map[status] ?? 'text-text-secondary bg-text-secondary/10'
}
