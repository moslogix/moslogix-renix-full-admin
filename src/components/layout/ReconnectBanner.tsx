'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WifiOff, RefreshCw } from 'lucide-react'

export function ReconnectBanner() {
  const [disconnected, setDisconnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('connection-monitor')
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setDisconnected(false)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setDisconnected(true)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (!disconnected) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-xs font-medium text-white animate-fade-in"
      style={{ background: 'linear-gradient(90deg, #b45309, #d97706)' }}
    >
      <WifiOff size={13} />
      Realtime disconnected — attempting to reconnect...
      <RefreshCw size={11} className="animate-spin" />
    </div>
  )
}
