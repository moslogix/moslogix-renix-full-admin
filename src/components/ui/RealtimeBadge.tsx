'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeBadge() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('realtime-health')

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus('connected')
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('disconnected')
      else setStatus('connecting')
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const colors = {
    connected: { dot: '#10b981', text: '#10b981', label: 'Live' },
    connecting: { dot: '#f59e0b', text: '#f59e0b', label: 'Connecting' },
    disconnected: { dot: '#ef4444', text: '#ef4444', label: 'Offline' },
  }

  const c = colors[status]

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: c.dot,
          boxShadow: status === 'connected' ? `0 0 6px ${c.dot}` : 'none',
          animation: status === 'connected' ? 'pulseDot 2s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ color: c.text }}>{c.label}</span>
    </div>
  )
}
