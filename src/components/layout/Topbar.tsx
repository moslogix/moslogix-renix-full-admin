'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, RefreshCw } from 'lucide-react'
import { RealtimeBadge } from '@/components/ui/RealtimeBadge'
import Link from 'next/link'

interface TopbarProps {
  title: string
  subtitle?: string
  unreadCount?: number
}

export function Topbar({ title, subtitle, unreadCount = 0 }: TopbarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{
        background: '#080b14',
        borderBottom: '1px solid #1e293b',
        height: '64px',
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-base font-semibold text-text-primary leading-none">{title}</h1>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <RealtimeBadge />

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: '#ef4444' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Current time */}
        <ClockDisplay />
      </div>
    </header>
  )
}

function ClockDisplay() {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Africa/Cairo',
        }).format(new Date())
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="px-3 py-1.5 rounded-lg font-mono text-xs text-text-muted"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      {time || '00:00:00'}
    </div>
  )
}
