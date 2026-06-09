'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Activity, ArrowUpRight } from 'lucide-react'
import type { AuditLog } from '@/types/database'

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

function humanReadable(log: AuditLog): string {
  const action = ACTION_LABELS[log.action] ?? log.action
  return `${action} ${log.entity_type}${log.entity_id ? ` #${log.entity_id.slice(-6)}` : ''}`
}

export function ActivityFeed() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)
      setLogs(data ?? [])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('audit-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setLogs((prev) => [payload.new as AuditLog, ...prev.slice(0, 7)])
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  return (
    <div
      className="rounded-xl p-5 flex-1"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} className="text-info" />
        <span className="text-sm font-semibold text-text-primary">Activity Feed</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-bg-surface transition-colors"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)' }}>
                <ArrowUpRight size={10} className="text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary leading-snug">{humanReadable(log)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{formatDate(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
