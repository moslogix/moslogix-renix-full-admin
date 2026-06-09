'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KPICard } from '@/components/ui/KPICard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopProductsChart } from '@/components/dashboard/TopProductsChart'
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts'
import { RecentOrders } from '@/components/dashboard/RecentOrders'
import { Topbar } from '@/components/layout/Topbar'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { RevenueSummary, ProductSalesSummary, CurrentStock, Order } from '@/types/database'

interface KPIs {
  todayRevenue: number
  todayOrders: number
  itemsSold: number
  activeCustomers: number
  revenueTrend: number
  ordersTrend: number
}

export default function DashboardPage() {
  const supabase = createClient()

  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary[]>([])
  const [topProducts, setTopProducts] = useState<ProductSalesSummary[]>([])
  const [lowStock, setLowStock] = useState<CurrentStock[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKPIs = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      // Today's orders
      const { data: todayOrders, error: e1 } = await supabase
        .from('orders')
        .select('total_amount, id')
        .gte('created_at', `${today}T00:00:00`)
        .neq('status', 'cancelled')

      if (e1) throw e1

      // Yesterday's orders (for trend)
      const { data: yestOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', `${yesterday}T00:00:00`)
        .lt('created_at', `${today}T00:00:00`)
        .neq('status', 'cancelled')

      // Items sold today
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('quantity, order_id, orders!inner(created_at, status)')
        .gte('orders.created_at', `${today}T00:00:00`)
        .neq('orders.status', 'cancelled')

      // Active customers (ordered in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      const { count: activeCustomers } = await supabase
        .from('orders')
        .select('customer_id', { count: 'exact', head: true })
        .neq('customer_id', null)
        .gte('created_at', thirtyDaysAgo)

      const todayRev = (todayOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
      const yestRev = (yestOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
      const revTrend = yestRev > 0 ? ((todayRev - yestRev) / yestRev) * 100 : 0
      const ordTrend = (yestOrders?.length ?? 0) > 0
        ? (((todayOrders?.length ?? 0) - (yestOrders?.length ?? 0)) / (yestOrders?.length ?? 1)) * 100
        : 0
      const items = (itemsData ?? []).reduce((s: number, i: { quantity: number }) => s + (i.quantity ?? 0), 0)

      setKpis({
        todayRevenue: todayRev,
        todayOrders: todayOrders?.length ?? 0,
        itemsSold: items,
        activeCustomers: activeCustomers ?? 0,
        revenueTrend: revTrend,
        ordersTrend: ordTrend,
      })
    } catch (err) {
      toast.error('Failed to load KPIs')
    }
  }, [supabase])

  const fetchPageData = useCallback(async () => {
    setLoading(true)
    try {
      await fetchKPIs()

      // Revenue chart (last 30 days)
      const { data: rev } = await supabase
        .from('revenue_summary')
        .select('*')
        .order('date', { ascending: true })
        .limit(30)
      setRevenueSummary(rev ?? [])

      // Top 5 products
      const { data: prods } = await supabase
        .from('product_sales_summary')
        .select('*')
        .order('total_units_sold', { ascending: false })
        .limit(5)
      setTopProducts(prods ?? [])

      // Low stock
      const { data: stock } = await supabase
        .from('current_stock')
        .select('*')
        .eq('is_low_stock', true)
        .limit(10)
      setLowStock(stock ?? [])

      // Recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      setRecentOrders(orders ?? [])
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [fetchKPIs, supabase])

  useEffect(() => {
    fetchPageData()

    // Realtime subscriptions
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchKPIs()
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => { if (data) setRecentOrders(data) })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, () => {
        supabase
          .from('current_stock')
          .select('*')
          .eq('is_low_stock', true)
          .limit(10)
          .then(({ data }) => { if (data) setLowStock(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchPageData, fetchKPIs, supabase])

  return (
    <div className="animate-fade-in">
      <Topbar title="Dashboard" subtitle="Real-time store overview" />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Today's Revenue"
            value={kpis?.todayRevenue ?? 0}
            format="currency"
            trend={kpis?.revenueTrend}
            icon={DollarSign}
            iconColor="#10b981"
            loading={loading}
          />
          <KPICard
            title="Orders Today"
            value={kpis?.todayOrders ?? 0}
            trend={kpis?.ordersTrend}
            icon={ShoppingCart}
            iconColor="#6272f3"
            loading={loading}
          />
          <KPICard
            title="Items Sold"
            value={kpis?.itemsSold ?? 0}
            icon={Package}
            iconColor="#f59e0b"
            loading={loading}
          />
          <KPICard
            title="Active Customers"
            value={kpis?.activeCustomers ?? 0}
            icon={Users}
            iconColor="#3b82f6"
            trendLabel="last 30 days"
            loading={loading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <RevenueChart data={revenueSummary} loading={loading} />
          </div>
          <div>
            <TopProductsChart data={topProducts} loading={loading} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <RecentOrders orders={recentOrders} loading={loading} />
          </div>
          <div className="flex flex-col gap-4">
            <LowStockAlerts items={lowStock} loading={loading} />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
