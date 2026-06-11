'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toast } from 'sonner'
import {
  Plus, Edit2, Trash2, X, GitBranch, Phone, MapPin,
  Users, ToggleLeft, ToggleRight, Check,
} from 'lucide-react'
import type { Branch, Profile } from '@/types/database'

interface BranchWithCount extends Branch {
  employee_count?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromAny = (supabase: any, table: string) => supabase.from(table)

export default function BranchesPage() {
  const supabase = createClient()
  const [branches, setBranches] = useState<BranchWithCount[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [assignBranch, setAssignBranch] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const load = useCallback(async () => {
    const [{ data: br }, { data: emps }] = await Promise.all([
      fromAny(supabase, 'branches').select('*').order('created_at') as Promise<{ data: Branch[] | null }>,
      fromAny(supabase, 'profiles').select('*').neq('role', 'customer') as Promise<{ data: Profile[] | null }>,
    ])
    const branchesWithCount = (br ?? []).map((b: Branch) => ({
      ...b,
      employee_count: (emps ?? []).filter((e: Profile) => e.branch_id === b.id).length,
    }))
    setBranches(branchesWithCount)
    setEmployees(emps ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditBranch(null)
    setName(''); setAddress(''); setPhone('')
    setShowModal(true)
  }

  function openEdit(branch: Branch) {
    setEditBranch(branch)
    setName(branch.name)
    setAddress(branch.address ?? '')
    setPhone(branch.phone ?? '')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editBranch) {
        const { error } = await fromAny(supabase, 'branches')
          .update({ name, address, phone })
          .eq('id', editBranch.id) as { error: { message: string } | null }
        if (error) toast.error(error.message)
        else { toast.success('Branch updated'); setShowModal(false); load() }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('Not authenticated'); return }

        const { data: profile } = await fromAny(supabase, 'profiles')
          .select('store_id')
          .eq('id', user.id)
          .single() as { data: { store_id: string } | null; error: unknown }

        const { error } = await fromAny(supabase, 'branches')
          .insert({ name, address, phone, is_active: true, store_id: profile?.store_id ?? '' }) as { error: { message: string } | null }
        if (error) toast.error(error.message)
        else { toast.success('Branch created'); setShowModal(false); load() }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this branch?')) return
    const { error } = await fromAny(supabase, 'branches')
      .delete()
      .eq('id', id) as { error: { message: string } | null }
    if (error) toast.error(error.message)
    else { toast.success('Branch deleted'); load() }
  }

  async function toggleActive(branch: Branch) {
    const { error } = await fromAny(supabase, 'branches')
      .update({ is_active: !branch.is_active })
      .eq('id', branch.id) as { error: { message: string } | null }
    if (error) toast.error(error.message)
    else {
      toast.success(branch.is_active ? 'Branch deactivated' : 'Branch activated')
      setBranches((prev) => prev.map((b) => b.id === branch.id ? { ...b, is_active: !branch.is_active } : b))
    }
  }

  async function assignEmployee(empId: string, branchId: string | null) {
    const { error } = await fromAny(supabase, 'profiles')
      .update({ branch_id: branchId })
      .eq('id', empId) as { error: { message: string } | null }
    if (error) toast.error(error.message)
    else {
      toast.success('Employee assigned')
      const updatedEmployees = employees.map((e) => e.id === empId ? { ...e, branch_id: branchId } : e)
      setEmployees(updatedEmployees)
      setBranches((prev) => prev.map((b) => ({
        ...b,
        employee_count: updatedEmployees.filter((e) => e.branch_id === b.id).length,
      })))
    }
  }

  const columns: Column<BranchWithCount>[] = [
    {
      key: 'name',
      header: 'Branch',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,114,243,0.12)' }}
          >
            <GitBranch size={14} className="text-brand-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">{row.name}</div>
            {row.address && <div className="text-xs text-text-muted truncate max-w-xs">{row.address}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone ? (
        <div className="flex items-center gap-1.5 text-text-secondary text-sm">
          <Phone size={12} className="text-text-muted" />
          {row.phone}
        </div>
      ) : <span className="text-text-muted">—</span>,
    },
    {
      key: 'employee_count',
      header: 'Employees',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-text-secondary text-sm">
          <Users size={12} className="text-text-muted" />
          {row.employee_count ?? 0}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <button onClick={() => toggleActive(row)} className="flex items-center gap-1.5 transition-colors">
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
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAssignBranch(row)}
            className="px-2 py-1 rounded text-xs text-brand-400 hover:bg-brand-400/10 transition-colors flex items-center gap-1"
          >
            <Users size={11} /> Assign
          </button>
          <button
            onClick={() => openEdit(row)}
            className="px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="px-2 py-1 rounded text-xs text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <Topbar title="Branches" subtitle={`${branches.length} locations`} />

      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> New Branch
          </button>
        </div>

        <DataTable
          columns={columns}
          data={branches}
          loading={loading}
          searchable
          searchPlaceholder="Search branches..."
          rowKey={(r) => r.id}
          emptyMessage="No branches yet — add your first location"
        />
      </div>

      {/* Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 animate-fade-in"
            style={{ background: '#0d1117', border: '1px solid #1e293b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">
                {editBranch ? 'Edit Branch' : 'New Branch'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Branch Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="Downtown Branch" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} /> Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-base resize-none"
                  rows={3}
                  placeholder="123 Main Street, Cairo"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={11} /> Phone
                </label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" placeholder="+20 100 000 0000" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                  {saving ? 'Saving...' : editBranch ? 'Update' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {assignBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in"
            style={{ background: '#0d1117', border: '1px solid #1e293b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Assign Employees</h3>
                <p className="text-xs text-text-muted mt-0.5">to {assignBranch.name}</p>
              </div>
              <button onClick={() => setAssignBranch(null)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {employees.filter((e) => e.role !== 'customer').map((emp) => {
                const assigned = emp.branch_id === assignBranch.id
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between px-3 py-3 rounded-xl transition-colors"
                    style={{
                      background: assigned ? 'rgba(99,114,243,0.08)' : '#111827',
                      border: `1px solid ${assigned ? 'rgba(99,114,243,0.2)' : '#1e293b'}`,
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium text-text-primary">{emp.full_name ?? emp.phone ?? '—'}</div>
                      <div className="text-xs text-text-muted capitalize">{emp.role}</div>
                    </div>
                    <button
                      onClick={() => assignEmployee(emp.id, assigned ? null : assignBranch.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: assigned ? 'rgba(239,68,68,0.1)' : 'rgba(99,114,243,0.15)',
                        color: assigned ? '#ef4444' : '#a5bbfc',
                        border: `1px solid ${assigned ? 'rgba(239,68,68,0.2)' : 'rgba(99,114,243,0.3)'}`,
                      }}
                    >
                      {assigned ? 'Unassign' : 'Assign'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}