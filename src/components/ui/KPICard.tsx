'use client'

import { type LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number | string
  format?: 'currency' | 'number' | 'raw'
  trend?: number // percent change
  trendLabel?: string
  icon: LucideIcon
  iconColor?: string
  loading?: boolean
  suffix?: string
}

export function KPICard({
  title,
  value,
  format = 'number',
  trend,
  trendLabel = 'vs yesterday',
  icon: Icon,
  iconColor = '#6272f3',
  loading = false,
  suffix,
}: KPICardProps) {
  const formattedValue =
    typeof value === 'number'
      ? format === 'currency'
        ? formatCurrency(value)
        : format === 'number'
        ? formatNumber(value)
        : String(value)
      : value

  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <div
      className="card-lift rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: '#0d1117',
        border: '1px solid #1e293b',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}18` }}
        >
          <Icon size={15} style={{ color: iconColor }} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div>
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton h-4 w-20 rounded mt-2" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-text-primary number-ticker tracking-tight">
            {formattedValue}
            {suffix && <span className="text-sm font-normal text-text-muted ml-1">{suffix}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  background: isPositive ? 'rgba(16,185,129,0.1)' : isNegative ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                  color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b',
                }}
              >
                <TrendIcon size={10} />
                {Math.abs(trend).toFixed(1)}%
              </div>
              <span className="text-xs text-text-muted">{trendLabel}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
