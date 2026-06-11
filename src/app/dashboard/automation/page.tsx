'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import {
  Plus, Zap, Edit2, Trash2, X, ToggleLeft, ToggleRight,
  Check, History,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AutomationRule, AuditLog } from '@/types/database'

const TRIGGER_EVENTS = [
  { value: 'stock.low', label: 'Stock Low', desc: 'Fires when product stock drops below threshold' },
  { value: 'order.created', label: 'Order Created', desc: 'Fires when a new order is placed' },
  { value: 'order.completed', label: 'Order Completed', desc: 'Fires when an order is marked delivered' },
  { value: 'shift.closed', label: 'Shift Closed', desc: 'Fires when a cashier closes their shift' },
]

const ACTION_TYPES = ['send_email', 'send_notification', 'create_purchase_order', 'webhook']

interface ActionConfig {
  type: string
  to?: string
  subject?: string
  body?: string
  title?: string
  message?: string
  url?: string
  supplier_id?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromAny = (supabase: any, table: string) => supabase.from(table)

function toActionConfigs(raw: unknown): ActionConfig[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is ActionConfig =>
    typeof item === 'object' && item !== null && 'type' in item
  )
}

function TriggerBadge({ event }: { event: string }) {
  const t = TRIGGER_EVENTS.find((x) => x.value === event)
  const colors: Record<string, string> = {
    'stock.low': '#f59e0b',
    'order.created': '#6272f3',
    'order.completed': '#10b981',
    'shift.closed': '#3b82f6',
  }
  const c = colors[event] ?? '#6272f3'
  return (
    <span className="status-badge" style={{ background: `${c}18`, color: c }}>
      {t?.label ?? event}
    </span>
  )
}

export default function AutomationPage() {
  const supabase = createClient()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [history, setHistory] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRule, setEditRule] = useState<AutomationRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules')

  // Form state
  const [ruleName, setRuleName] = useState('')
  const [trigger, setTrigger] = useState('stock.low')
  const [actionType, setActionType] = useState('send_notification')
  const [actionConfig, setActionConfig] = useState<ActionConfig>({ type: 'send_notification', title: '', message: '' })

  const load = useCallback(async () => {
    const [{ data: r }, { data: h }] = await Promise.all([
      fromAny(supabase, 'automation_rules').select('*').order('created_at', { ascending: false }) as Promise<{ data: AutomationRule[] | null }>,
      fromAny(supabase, 'audit_log').select('*').eq('entity_type', 'automation').order('created_at', { ascending: false }).limit(20) as Promise<{ data: AuditLog[] | null }>,
    ])
    setRules(r ?? [])
    setHistory(h ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditRule(null)
    setRuleName('')
    setTrigger('stock.low')
    setActionType('send_notification')
    setActionConfig({ type: 'send_notification', title: '', message: '' })
    setShowModal(true)
  }

  function openEdit(rule: AutomationRule) {
    setEditRule(rule)
    setRuleName(rule.name)
    setTrigger(rule.trigger_event)
    const actions = toActionConfigs(rule.actions)
    const first = actions[0] ?? { type: 'send_notification' }
    setActionType(first.type)
    setActionConfig(first)
    setShowModal(true)
  }

  function updateActionConfig(key: keyof ActionConfig, value: string) {
    setActionConfig((prev) => ({ ...prev, [key]: value, type: actionType }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); setSaving(false); return }

      const { data: profile } = await fromAny(supabase, 'profiles')
        .select('store_id')
        .eq('id', user.id)
        .single() as { data: { store_id: string } | null; error: unknown }

      const payload = {
        name: ruleName,
        trigger_event: trigger as AutomationRule['trigger_event'],
        actions: [{ ...actionConfig, type: actionType }],
        is_active: true,
        store_id: profile?.store_id ?? '',
      }

      if (editRule) {
        const { error } = await fromAny(supabase, 'automation_rules')
          .update(payload)
          .eq('id', editRule.id) as { error: { message: string } | null }
        if (error) toast.error(error.message)
        else { toast.success('Rule updated'); setShowModal(false); load() }
      } else {
        const { error } = await fromAny(supabase, 'automation_rules')
          .insert(payload) as { error: { message: string } | null }
        if (error) toast.error(error.message)
        else { toast.success('Rule created'); setShowModal(false); load() }
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(rule: AutomationRule) {
    const { error } = await fromAny(supabase, 'automation_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id) as { error: { message: string } | null }
    if (error) toast.error(error.message)
    else {
      toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated')
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !rule.is_active } : r))
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return
    const { error } = await fromAny(supabase, 'automation_rules')
      .delete()
      .eq('id', id) as { error: { message: string } | null }
    if (error) toast.error(error.message)
    else { toast.success('Rule deleted'); load() }
  }

  const columns: Column<AutomationRule>[] = [
    {
      key: 'name',
      header: 'Rule',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,114,243,0.12)' }}>
            <Zap size={14} className="text-brand-400" />
          </div>
          <div className="font-medium text-sm text-text-primary">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'trigger_event',
      header: 'Trigger',
      render: (row) => <TriggerBadge event={row.trigger_event} />,
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => {
        const actions = toActionConfigs(row.actions)
        const first = actions[0]
        return (
          <span className="text-xs text-text-secondary font-mono px-2 py-1 rounded"
            style={{ background: '#111827' }}>
            {first?.type ?? '—'}
          </span>
        )
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <button onClick={() => toggleRule(row)} className="flex items-center gap-1.5">
          {row.is_active
            ? <ToggleRight size={20} className="text-success" />
            : <ToggleLeft size={20} className="text-text-muted" />}
          <span className={`text-xs font-medium ${row.is_active ? 'text-success' : 'text-text-muted'}`}>
            {row.is_active ? 'Active' : 'Inactive'}
          </span>
        </button>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => <span className="text-xs text-text-muted">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'rule_actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => deleteRule(row.id)}
            className="p-1.5 rounded text-danger hover:bg-danger/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <Topbar title="Automation" subtitle="Rules & triggers" />

      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-0 p-1 rounded-xl w-fit"
          style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
          {(['rules', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
              style={{
                background: activeTab === tab ? 'rgba(99,114,243,0.15)' : 'transparent',
                color: activeTab === tab ? '#a5bbfc' : '#64748b',
              }}
            >
              {tab === 'rules' ? <Zap size={13} /> : <History size={13} />}
              {tab === 'rules' ? 'Rules' : 'History'}
            </button>
          ))}
        </div>

        {activeTab === 'rules' ? (
          <>
            <div className="flex justify-end">
              <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                <Plus size={14} /> New Rule
              </button>
            </div>
            <DataTable
              columns={columns}
              data={rules}
              loading={loading}
              searchable
              searchPlaceholder="Search rules..."
              rowKey={(r) => r.id}
              emptyMessage="No automation rules yet"
            />
          </>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded-lg" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm">No automation history</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log.id}>
                      <td><span className="status-badge text-brand-400 bg-brand-400/10">{log.action}</span></td>
                      <td><span className="text-text-secondary text-xs">{log.entity_type}</span></td>
                      <td><span className="text-text-muted text-xs font-mono">{log.performed_by?.slice(-8) ?? '—'}</span></td>
                      <td><span className="text-text-muted text-xs">{formatDate(log.created_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 animate-fade-in"
            style={{ background: '#0d1117', border: '1px solid #1e293b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">
                {editRule ? 'Edit Rule' : 'New Automation Rule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Rule Name
                </label>
                <input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="input-base"
                  placeholder="Low stock reorder"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Trigger Event
                </label>
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="input-base">
                  {TRIGGER_EVENTS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => {
                    setActionType(e.target.value)
                    setActionConfig({ type: e.target.value })
                  }}
                  className="input-base"
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {actionType === 'send_email' && (
                <div className="space-y-3 p-3 rounded-xl" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <input value={actionConfig.to ?? ''} onChange={(e) => updateActionConfig('to', e.target.value)} className="input-base" placeholder="To: email@example.com" />
                  <input value={actionConfig.subject ?? ''} onChange={(e) => updateActionConfig('subject', e.target.value)} className="input-base" placeholder="Subject" />
                  <textarea value={actionConfig.body ?? ''} onChange={(e) => updateActionConfig('body', e.target.value)} className="input-base resize-none" rows={3} placeholder="Email body..." />
                </div>
              )}
              {actionType === 'send_notification' && (
                <div className="space-y-3 p-3 rounded-xl" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <input value={actionConfig.title ?? ''} onChange={(e) => updateActionConfig('title', e.target.value)} className="input-base" placeholder="Notification title" />
                  <textarea value={actionConfig.message ?? ''} onChange={(e) => updateActionConfig('message', e.target.value)} className="input-base resize-none" rows={2} placeholder="Notification message..." />
                </div>
              )}
              {actionType === 'webhook' && (
                <div className="space-y-3 p-3 rounded-xl" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <input value={actionConfig.url ?? ''} onChange={(e) => updateActionConfig('url', e.target.value)} className="input-base" placeholder="https://your-webhook.com/endpoint" type="url" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check size={14} />}
                  {saving ? 'Saving...' : editRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}