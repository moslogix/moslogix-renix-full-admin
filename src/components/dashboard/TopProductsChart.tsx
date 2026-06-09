'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ProductSalesSummary } from '@/types/database'
import { Package } from 'lucide-react'

interface TopProductsChartProps {
  data: ProductSalesSummary[]
  loading?: boolean
}

const COLORS = ['#6272f3', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ProductSalesSummary; value: number }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm max-w-xs"
      style={{ background: '#111827', border: '1px solid #253044', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
    >
      <div className="font-medium text-text-primary truncate mb-1">{d.product_name}</div>
      <div className="text-text-muted text-xs">{d.total_units_sold} units sold</div>
    </div>
  )
}

export function TopProductsChart({ data, loading }: TopProductsChartProps) {
  const chartData = data.map((d) => ({
    name: d.product_name.length > 14 ? d.product_name.slice(0, 14) + '…' : d.product_name,
    units: d.total_units_sold,
    ...d,
  }))

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Package size={15} className="text-warning" />
        <span className="text-sm font-semibold text-text-primary">Top Products</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-8">No sales data</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="units" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
