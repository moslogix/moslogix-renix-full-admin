'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { toast } from 'sonner'
import { Save, Upload, Clock, Percent, Eye, Palette, Type } from 'lucide-react'
import Image from 'next/image'

interface StoreSettings {
  id: string
  name: string
  logo_url: string | null
  vat_rate: number
  settings: {
    hours?: { open: string; close: string; days: string[] }
    timezone?: string
  }
  theme_config: {
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    font?: string
    dark_mode?: boolean
  }
}

const FONTS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Cairo', value: 'Cairo' },
  { label: 'Tajawal', value: 'Tajawal' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function StoreSettingsPage() {
  const supabase = createClient()
  const [store, setStore] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [vatRate, setVatRate] = useState(14)
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon','Tue','Wed','Thu','Fri','Sat'])
  const [primaryColor, setPrimaryColor] = useState('#6272f3')
  const [secondaryColor, setSecondaryColor] = useState('#10b981')
  const [accentColor, setAccentColor] = useState('#f59e0b')
  const [font, setFont] = useState('Inter')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('stores').select('*').limit(1).single()
    if (error) { toast.error('Failed to load store'); setLoading(false); return }

    const s = data as StoreSettings
    setStore(s)
    setName(s.name)
    setVatRate(Math.round((s.vat_rate ?? 0.14) * 100))
    setLogoPreview(s.logo_url)

    const h = (s.settings as StoreSettings['settings'])?.hours
    if (h) { setOpenTime(h.open ?? '08:00'); setCloseTime(h.close ?? '22:00'); setSelectedDays(h.days ?? []) }

    const t = s.theme_config as StoreSettings['theme_config']
    if (t) {
      setPrimaryColor(t.primary_color ?? '#6272f3')
      setSecondaryColor(t.secondary_color ?? '#10b981')
      setAccentColor(t.accent_color ?? '#f59e0b')
      setFont(t.font ?? 'Inter')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !store) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${store.id}.${ext}`

    const { error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'renix-storage')
      .upload(path, file, { upsert: true })

    if (error) { toast.error('Upload failed'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'renix-storage')
      .getPublicUrl(path)

    setLogoPreview(publicUrl)
    toast.success('Logo uploaded')
    setUploading(false)
  }

  async function handleSave() {
    if (!store) return
    setSaving(true)

    const { error } = await supabase
      .from('stores')
      .update({
        name,
        logo_url: logoPreview,
        vat_rate: vatRate / 100,
        settings: {
          ...((store.settings as object) ?? {}),
          hours: { open: openTime, close: closeTime, days: selectedDays },
        },
        theme_config: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          font,
        },
      })
      .eq('id', store.id)

    if (error) toast.error('Failed to save: ' + error.message)
    else toast.success('Store settings saved')

    setSaving(false)
  }

  function toggleDay(d: string) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Topbar title="Store Settings" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Store Settings" subtitle="Configure your store profile and theme" />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: forms */}
        <div className="xl:col-span-2 space-y-5">
          {/* Basic Info */}
          <section
            className="rounded-xl p-6"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Save size={14} className="text-brand-400" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Store Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="MOS Logix Store" />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Store Logo</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: '#111827', border: '1px solid #1e293b' }}
                  >
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Logo" width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                      <Upload size={20} className="text-text-muted" />
                    )}
                  </div>
                  <label className="btn-secondary flex items-center gap-2 cursor-pointer text-sm">
                    <Upload size={13} />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Store Hours */}
          <section
            className="rounded-xl p-6"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock size={14} className="text-success" />
              Store Hours
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Opens At</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Closes At</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">Open Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedDays.includes(d) ? 'rgba(99,114,243,0.2)' : '#111827',
                      border: `1px solid ${selectedDays.includes(d) ? '#6272f3' : '#1e293b'}`,
                      color: selectedDays.includes(d) ? '#a5bbfc' : '#64748b',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* VAT */}
          <section
            className="rounded-xl p-6"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Percent size={14} className="text-warning" />
              Tax Settings
            </h2>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">VAT Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value))}
                  className="input-base pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">%</span>
              </div>
              <p className="text-xs text-text-muted mt-1.5">Currently: {vatRate}% — applies to all taxable items</p>
            </div>
          </section>

          {/* Theme */}
          <section
            className="rounded-xl p-6"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Palette size={14} className="text-info" />
              Theme Configuration
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Primary Color', value: primaryColor, set: setPrimaryColor },
                { label: 'Secondary Color', value: secondaryColor, set: setSecondaryColor },
                { label: 'Accent Color', value: accentColor, set: setAccentColor },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>
                  <div className="flex items-center gap-2">
                    <label className="relative cursor-pointer">
                      <div
                        className="w-9 h-9 rounded-lg border-2 transition-all"
                        style={{ background: value, borderColor: '#253044' }}
                      />
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="input-base text-xs py-2 font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Type size={12} />
                Font Family
              </label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="input-base"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="xl:col-span-1">
          <div
            className="rounded-xl p-5 sticky top-6"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Eye size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Live Preview</span>
            </div>

            {/* Mini store preview */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: '#060a0f', border: '1px solid #1e293b', fontFamily: font }}
            >
              {/* Header preview */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: primaryColor }}
              >
                <div className="flex items-center gap-2">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo" width={24} height={24} className="rounded object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-white/20" />
                  )}
                  <span className="text-white font-bold text-sm">{name || 'Store Name'}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-5 h-5 rounded" style={{ background: secondaryColor }} />
                  <div className="w-5 h-5 rounded" style={{ background: accentColor }} />
                </div>
              </div>

              {/* Body preview */}
              <div className="p-3 space-y-2">
                <div className="h-2 rounded-full w-3/4" style={{ background: primaryColor + '33' }} />
                <div className="h-2 rounded-full w-1/2" style={{ background: primaryColor + '22' }} />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg p-2" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
                      <div className="h-10 rounded mb-1" style={{ background: primaryColor + '1a' }} />
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: '#1e293b' }} />
                      <div className="h-1.5 rounded-full w-1/2 mt-1" style={{ background: accentColor + '66' }} />
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-2 rounded-lg text-xs font-bold text-white mt-1"
                  style={{ background: secondaryColor }}
                >
                  Checkout — {vatRate}% VAT
                </button>
              </div>
            </div>

            {/* Font demo */}
            <div className="mt-4 px-3 py-3 rounded-lg" style={{ background: '#111827', fontFamily: font }}>
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Font: {font}</p>
              <p className="text-sm text-text-primary">The quick brown fox</p>
              <p className="text-xs text-text-secondary">0123456789 EGP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
