'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { toast } from 'sonner'
import {
  Bell, Package, ShoppingCart, AlertTriangle,
  CreditCard, Settings, Check, CheckCheck, Filter,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/types/database'

type FilterType = 'all' | Notification['type']

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  low_stock: { icon: Package, color: '#f59e0b', label: 'Low Stock' },
  order_update: { icon: ShoppingCart, color: '#6272f3', label: 'Order Update' },
  system: { icon: Settings, color: '#64748b', label: 'System' },
  payment: { icon: CreditCard, color: '#10b981', label: 'Payment' },
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [markingRead, setMarkingRead] = useState(false)

  const load = useCallback(async () => {
    const query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data, error } = await query
    if (error) { toast.error('Failed to load notifications'); return }
    setNotifications(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()

    // Realtime subscription
    const ch = supabase
      .channel('notifications-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev])
        toast(((payload.new as Notification).title), {
          description: (payload.new as Notification).message,
          icon: <Bell size={15} />,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [load, supabase])

  async function markAllRead() {
    setMarkingRead(true)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) toast.error('Failed to mark as read')
    else {
      toast.success('All notifications marked as read')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
    setMarkingRead(false)
  }

  async function markOneRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const FILTER_TYPES: FilterType[] = ['all', 'low_stock', 'order_update', 'payment', 'system']

  return (
    <div className="animate-fade-in">
      <Topbar title="Notifications" subtitle={`${unreadCount} unread`} unreadCount={unreadCount} />

      <div className="p-6 space-y-5">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
            {FILTER_TYPES.map((type) => {
              const count = type === 'all' ? notifications.length : notifications.filter((n) => n.type === type).length
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
                  style={{
                    background: filter === type ? 'rgba(99,114,243,0.15)' : 'transparent',
                    color: filter === type ? '#a5bbfc' : '#64748b',
                  }}
                >
                  {type === 'all' ? 'All' : TYPE_CONFIG[type]?.label ?? type}
                  {count > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: filter === type ? 'rgba(99,114,243,0.3)' : '#1e293b',
                        color: filter === type ? '#a5bbfc' : '#64748b',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {markingRead
                ? <div className="w-3.5 h-3.5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                : <CheckCheck size={14} />}
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#0d1117', border: '1px solid #1e293b' }}
        >
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell size={36} className="text-text-muted mb-3 opacity-40" />
              <p className="text-text-muted text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#111827' }}>
              {filtered.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, color: '#64748b', label: n.type }
                const Icon = cfg.icon

                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-4 px-5 py-4 transition-colors group cursor-pointer"
                    style={{ background: n.is_read ? 'transparent' : 'rgba(99,114,243,0.04)' }}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${cfg.color}18` }}
                    >
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {!n.is_read && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: cfg.color }}
                              />
                            )}
                            <p className="text-sm font-medium text-text-primary leading-snug">{n.title}</p>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className="status-badge text-xs"
                            style={{ background: `${cfg.color}18`, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <p className="text-[10px] text-text-muted mt-1">{formatDate(n.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markOneRead(n.id) }}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                        title="Mark as read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
