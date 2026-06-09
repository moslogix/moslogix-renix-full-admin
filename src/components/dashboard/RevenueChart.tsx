'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import type { RevenueSummary } from '@/types/database'
import { format } from 'date-fns'
import { TrendingUp } from 'lucide-react'

interface RevenueChartProps {
  data: RevenueSummary[]
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: '#111827', border: '1px solid #253044', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
    >
      <div className="text-text-muted text-xs mb-1">{label}</div>
      <div className="font-bold text-text-primary">
        {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(payload[0].value)}
      </div>
    </div>
  )
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    revenue: d.total_revenue,
    orders: d.order_count,
  }))

  const total = data.reduce((s, d) => s + d.total_revenue, 0)

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-brand-400" />
            <span className="text-sm font-semibold text-text-primary">Revenue (Last 30 Days)</span>
          </div>
          {!loading && (
            <div className="text-xs text-text-muted mt-0.5">
              Total:{' '}
              <span className="text-success font-medium">
                {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(total)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-3 h-0.5 rounded" style={{ background: '#6272f3' }} />
            Revenue
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton rounded-lg" style={{ height: 200 }} />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6272f3" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6272f3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6272f3"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#6272f3', stroke: '#080b14', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
