'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { toast } from 'sonner'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Save, Trash2, GripVertical, Eye, Layers,
  Image, Grid, AlignJustify, Tag, Star, Settings2, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { UiConfig } from '@/types/database'

type Platform = 'customer_app' | 'pos'
type PageName = 'home' | 'product_list' | 'checkout' | 'category'

interface Component {
  id: string
  type: string
  props: Record<string, unknown>
}

const COMPONENT_TYPES = [
  { type: 'hero_banner', label: 'Hero Banner', icon: Image, color: '#6272f3', defaultProps: { title: 'Welcome', subtitle: '', image_url: '', cta_text: 'Shop Now', cta_link: '/' } },
  { type: 'product_grid', label: 'Product Grid', icon: Grid, color: '#10b981', defaultProps: { columns: 4, limit: 12, category_id: null, show_price: true } },
  { type: 'category_strip', label: 'Category Strip', icon: AlignJustify, color: '#f59e0b', defaultProps: { title: 'Categories', show_all: true, limit: 8 } },
  { type: 'promo_banner', label: 'Promo Banner', icon: Tag, color: '#ef4444', defaultProps: { title: 'Special Offer', subtitle: '', discount: '20%', image_url: '', link: '/' } },
  { type: 'testimonials', label: 'Testimonials', icon: Star, color: '#a78bfa', defaultProps: { title: 'What Customers Say', limit: 6 } },
]

const PAGES: PageName[] = ['home', 'product_list', 'checkout', 'category']

function SortableItem({ comp, onRemove, onEdit }: { comp: Component; onRemove: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comp.id })
  const cfg = COMPONENT_TYPES.find((c) => c.type === comp.type)
  const Icon = cfg?.icon ?? Layers

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: '#111827',
        border: '1px solid #1e293b',
        borderRadius: 12,
      }}
      className="flex items-center gap-3 px-4 py-3 group"
    >
      <button {...attributes} {...listeners} className="text-text-muted cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={16} />
      </button>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${cfg?.color ?? '#6272f3'}18` }}
      >
        <Icon size={13} style={{ color: cfg?.color ?? '#6272f3' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{cfg?.label ?? comp.type}</div>
        <div className="text-xs text-text-muted font-mono">{comp.type}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded text-text-muted hover:text-brand-400 hover:bg-brand-400/10 transition-colors">
          <Settings2 size={13} />
        </button>
        <button onClick={onRemove} className="p-1.5 rounded text-danger hover:bg-danger/10 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function LivePreview({ components }: { components: Component[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#060a0f', border: '1px solid #1e293b', minHeight: 400 }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: '#0a0e1a', borderBottom: '1px solid #1e293b' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
        </div>
        <div className="text-xs text-text-muted font-mono mx-auto">Preview — mobile</div>
      </div>

      <div className="p-3 space-y-3">
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers size={32} className="text-text-muted mb-3 opacity-30" />
            <p className="text-text-muted text-xs">Drag components here</p>
          </div>
        ) : (
          components.map((comp) => {
            const cfg = COMPONENT_TYPES.find((c) => c.type === comp.type)
            const Icon = cfg?.icon ?? Layers
            return (
              <div
                key={comp.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: `${cfg?.color ?? '#6272f3'}0d`,
                  border: `1px dashed ${cfg?.color ?? '#6272f3'}33`,
                }}
              >
                <Icon size={20} style={{ color: cfg?.color ?? '#6272f3' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: cfg?.color ?? '#6272f3' }}>{cfg?.label ?? comp.type}</div>
                  <div className="text-xs text-text-muted">{JSON.stringify(comp.props).slice(0, 60)}…</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function PageBuilderPage() {
  const supabase = createClient()
  const [platform, setPlatform] = useState<Platform>('customer_app')
  const [page, setPage] = useState<PageName>('home')
  const [components, setComponents] = useState<Component[]>([])
  const [configId, setConfigId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editComp, setEditComp] = useState<Component | null>(null)
  const [editProps, setEditProps] = useState<string>('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadConfig = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('ui_configs') as any)
      .select('*')
      .eq('platform', platform)
      .eq('page', page)
      .maybeSingle()

    if (data) {
      setConfigId(data.id)
      const layout = (data.layout as { components?: Component[] })
      setComponents(layout?.components ?? [])
    } else {
      setConfigId(null)
      setComponents([])
    }
    setLoading(false)
  }, [supabase, platform, page])

  useEffect(() => { loadConfig() }, [loadConfig])

  function addComponent(type: string) {
    const cfg = COMPONENT_TYPES.find((c) => c.type === type)
    const newComp: Component = {
      id: `${type}-${Date.now()}`,
      type,
      props: { ...(cfg?.defaultProps ?? {}) },
    }
    setComponents((prev) => [...prev, newComp])
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setComponents((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any).select('store_id').eq('id', user!.id).single()

    const layout = { components }

    if (configId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('ui_configs') as any).update({ layout }).eq('id', configId)
      if (error) toast.error(error.message)
      else toast.success('Page config saved')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ui_configs') as any).insert({
        platform, page, layout, is_active: true,
        store_id: profile?.store_id ?? '',
      }).select().single()
      if (error) toast.error(error.message)
      else { setConfigId(data.id); toast.success('Page config created') }
    }
    setSaving(false)
  }

  function openEdit(comp: Component) {
    setEditComp(comp)
    setEditProps(JSON.stringify(comp.props, null, 2))
  }

  function saveEditProps() {
    if (!editComp) return
    try {
      const parsedProps = JSON.parse(editProps)
      setComponents((prev) => prev.map((c) => c.id === editComp.id ? { ...c, props: parsedProps } : c))
      setEditComp(null)
      toast.success('Props updated')
    } catch {
      toast.error('Invalid JSON')
    }
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Visual Page Builder" subtitle="No-code UI configuration" />

      <div className="p-6 space-y-5">
        {/* Platform + Page selectors */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
            {(['customer_app', 'pos'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: platform === p ? 'rgba(99,114,243,0.15)' : 'transparent',
                  color: platform === p ? '#a5bbfc' : '#64748b',
                }}
              >
                {p === 'customer_app' ? '📱 Customer App' : '🖥 POS'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
            {PAGES.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: page === p ? 'rgba(99,114,243,0.15)' : 'transparent',
                  color: page === p ? '#a5bbfc' : '#64748b',
                }}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save Layout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Component Palette */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Components</span>
            </div>
            <div className="space-y-2">
              {COMPONENT_TYPES.map((comp) => {
                const Icon = comp.icon
                return (
                  <button
                    key={comp.type}
                    onClick={() => addComponent(comp.type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group hover:scale-[1.01]"
                    style={{ background: '#111827', border: '1px solid #1e293b' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${comp.color}18` }}
                    >
                      <Icon size={15} style={{ color: comp.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{comp.label}</div>
                      <div className="text-xs text-text-muted font-mono">{comp.type}</div>
                    </div>
                    <Plus size={14} className="text-text-muted group-hover:text-brand-400 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Canvas */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Canvas</span>
              <span className="text-xs text-text-muted ml-auto">{components.length} components</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {components.map((comp) => (
                      <SortableItem
                        key={comp.id}
                        comp={comp}
                        onRemove={() => removeComponent(comp.id)}
                        onEdit={() => openEdit(comp)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {!loading && components.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Layers size={28} className="text-text-muted mb-2 opacity-30" />
                <p className="text-xs text-text-muted">Click a component to add it</p>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Preview</span>
            </div>
            <LivePreview components={components} />
          </div>
        </div>
      </div>

      {/* Prop Editor Modal */}
      {editComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 animate-fade-in"
            style={{ background: '#0d1117', border: '1px solid #1e293b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">Edit Props — {editComp.type}</h3>
              <button onClick={() => setEditComp(null)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <textarea
              value={editProps}
              onChange={(e) => setEditProps(e.target.value)}
              rows={14}
              className="input-base font-mono text-xs"
              spellCheck={false}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditComp(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveEditProps} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={14} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
