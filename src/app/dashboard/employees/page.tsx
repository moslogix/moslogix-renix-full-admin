'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import {
  UserPlus, Mail, Shield, UserX, Clock, X, ChevronDown,
  Users, CheckCircle, XCircle,
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import type { Profile, Shift } from '@/types/database'

const ROLES = [
  { value: 'store_admin', label: 'Store Admin', color: '#6272f3' },
  { value: 'manager', label: 'Manager', color: '#10b981' },
  { value: 'cashier', label: 'Cashier', color: '#f59e0b' },
  { value: 'inventory_staff', label: 'Inventory Staff', color: '#3b82f6' },
  { value: 'accountant', label: 'Accountant', color: '#a78bfa' },
]

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role)
  return (
    <span
      className="status-badge"
      style={{ background: `${r?.color ?? '#6272f3'}18`, color: r?.color ?? '#6272f3' }}
    >
      {r?.label ?? role}
    </span>
  )
}

export default function EmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'customer')
      .order('created_at', { ascending: false })
    if (error) { toast.error('Failed to load employees'); return }
    setEmployees(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, full_name: inviteName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail(''); setInviteRole('cashier'); setInviteName('')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invite failed')
    }
    setInviting(false)
  }

  async function handleRoleChange(id: string, role: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({ role: role as Profile['role'] }).eq('id', id)
    if (error) { toast.error('Failed to update role'); return }
    toast.success('Role updated')
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, role: role as Profile['role'] } : e))
  }

  async function handleDeactivate(id: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({ is_active: !current }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    toast.success(current ? 'Employee deactivated' : 'Employee activated')
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, is_active: !current } : e))
  }

  async function viewShifts(emp: Profile) {
    setSelectedEmployee(emp)
    setShiftsLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('cashier_id', emp.id)
      .order('started_at', { ascending: false })
      .limit(10)
    setShifts(data ?? [])
    setShiftsLoading(false)
  }

  const columns: Column<Profile>[] = [
    {
      key: 'full_name',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#4f56e7,#6272f3)' }}
          >
            {getInitials(row.full_name ?? row.phone ?? '')}
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">{row.full_name ?? '—'}</div>
            <div className="text-xs text-text-muted">{row.phone ?? '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <select
          value={row.role}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer transition-colors"
          style={{ background: '#111827', border: '1px solid #253044', color: '#94a3b8' }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <span className={`status-badge ${row.is_active ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => <span className="text-text-muted text-xs">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewShifts(row)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-400 transition-colors px-2 py-1 rounded"
          >
            <Clock size={12} /> Shifts
          </button>
          <button
            onClick={() => handleDeactivate(row.id, row.is_active)}
            className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded"
            style={{ color: row.is_active ? '#ef4444' : '#10b981' }}
          >
            {row.is_active ? <><UserX size={12} /> Deactivate</> : <><CheckCircle size={12} /> Activate</>}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <Topbar title="Employees" subtitle={`${employees.length} team members`} />

      <div className="p-6 space-y-5">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ROLES.map((r) => {
              const count = employees.filter((e) => e.role === r.value).length
              return count > 0 ? (
                <div key={r.value} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                  {r.label}: {count}
                </div>
              ) : null
            })}
          </div>
          <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={14} />
            Invite Employee
          </button>
        </div>

        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          searchable
          searchPlaceholder="Search by name or email..."
          rowKey={(r) => r.id}
          emptyMessage="No employees found"
        />
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 animate-fade-in"
            style={{ background: '#0d1117', border: '1px solid #1e293b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">Invite Employee</h3>
              <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Full Name</label>
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="input-base" placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-base pl-9"
                    placeholder="employee@store.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} />
                  Role
                </label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-base">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={inviting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {inviting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={14} />}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift History Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={() => setSelectedEmployee(null)}>
          <div
            className="w-full max-w-md h-full overflow-y-auto p-6 animate-slide-in"
            style={{ background: '#0d1117', borderLeft: '1px solid #1e293b' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-text-primary">{selectedEmployee.full_name ?? selectedEmployee.phone ?? '—'}</h3>
                <p className="text-xs text-text-muted mt-0.5">Shift History</p>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            {shiftsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : shifts.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-12">No shifts recorded</p>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl p-4"
                    style={{ background: '#111827', border: '1px solid #1e293b' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`status-badge ${shift.status === 'open' ? 'text-success bg-success/10' : 'text-text-muted bg-text-muted/10'}`}>
                        {shift.status === 'open' ? 'Active' : 'Closed'}
                      </span>
                      <span className="text-xs text-text-muted">{formatDate(shift.started_at)}</span>
                    </div>
                    <div className="text-xs text-text-secondary mb-3 flex flex-wrap gap-2">
                      <span>Open: {new Date(shift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {shift.status === 'closed' && shift.ended_at && <span>• Closed: {new Date(shift.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      <span>• Total time: {
                        shift.ended_at 
                          ? (() => {
                              const diffMs = new Date(shift.ended_at).getTime() - new Date(shift.started_at).getTime();
                              const diffHrs = Math.floor(diffMs / 3600000);
                              const diffMins = Math.floor((diffMs % 3600000) / 60000);
                              return `${diffHrs}h ${diffMins}m`;
                            })()
                          : 'Ongoing'
                      }</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted">Opening Cash: </span>
                        <span className="text-text-primary font-medium">{shift.opening_cash.toFixed(2)} EGP</span>
                      </div>
                      {shift.closing_cash !== null && (
                        <div>
                          <span className="text-text-muted">Closing Cash: </span>
                          <span className="text-text-primary font-medium">{shift.closing_cash.toFixed(2)} EGP</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
