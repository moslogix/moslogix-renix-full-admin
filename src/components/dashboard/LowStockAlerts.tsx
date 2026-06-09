'use client'

import { AlertTriangle, Package } from 'lucide-react'
import type { CurrentStock } from '@/types/database'

interface LowStockAlertsProps {
  items: CurrentStock[]
  loading?: boolean
}

export function LowStockAlerts({ items, loading }: LowStockAlertsProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-warning" />
          <span className="text-sm font-semibold text-text-primary">Low Stock Alerts</span>
        </div>
        {!loading && items.length > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
          >
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Package size={28} className="text-success mb-2 opacity-60" />
          <p className="text-sm text-text-muted">All stock levels are healthy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const pct = item.low_stock_threshold > 0
              ? Math.min(100, (item.quantity / item.low_stock_threshold) * 100)
              : 0
            const isCritical = item.quantity === 0

            return (
              <div
                key={`${item.product_id}-${item.branch_id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{
                  background: isCritical ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                  border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}
                >
                  <Package size={12} style={{ color: isCritical ? '#ef4444' : '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary truncate">{item.product_name}</div>
                  <div
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: isCritical ? '#ef4444' : '#f59e0b' }}
                  >
                    {isCritical ? 'Out of stock' : `${item.quantity} left`}
                  </div>
                </div>
                {/* Mini progress */}
                <div className="w-12 h-1.5 rounded-full bg-bg-muted overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: isCritical ? '#ef4444' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
