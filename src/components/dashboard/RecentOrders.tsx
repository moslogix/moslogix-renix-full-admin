'use client'

import type { Order } from '@/types/database'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { ShoppingCart, ExternalLink } from 'lucide-react'

interface RecentOrdersProps {
  orders: Order[]
  loading?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const SOURCE_LABELS: Record<string, string> = {
  pos: 'POS',
  online: 'Online',
  app: 'App',
}

export function RecentOrders({ orders, loading }: RecentOrdersProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1e293b' }}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={15} className="text-brand-400" />
          <span className="text-sm font-semibold text-text-primary">Recent Orders</span>
        </div>
        <span className="text-xs text-text-muted">Last 10</span>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">No orders yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Source</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="font-mono text-xs text-brand-300">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="text-text-secondary">{formatDate(order.created_at)}</span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ background: 'rgba(99,114,243,0.1)', color: '#a5bbfc' }}
                    >
                      {SOURCE_LABELS[order.source] ?? order.source}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-semibold text-text-primary">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
