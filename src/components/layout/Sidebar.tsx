'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Store,
  Users,
  GitBranch,
  Zap,
  Bell,
  LogOut,
  ChevronRight,
  Settings,
  Package,
  Layers,
} from 'lucide-react'

const navItems = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Store Settings',
    href: '/dashboard/store',
    icon: Store,
    children: [
      { label: 'Settings', href: '/dashboard/store' },
      { label: 'Page Builder', href: '/dashboard/store/builder' },
    ],
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: Users,
  },
  {
    label: 'Branches',
    href: '/dashboard/branches',
    icon: GitBranch,
  },
  {
    label: 'Automation',
    href: '/dashboard/automation',
    icon: Zap,
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
]

interface SidebarProps {
  userEmail: string
  userRole: string
}

export function Sidebar({ userEmail, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  function isActive(item: (typeof navItems)[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{
        background: '#080b14',
        borderRight: '1px solid #1e293b',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-dim">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f56e7, #6272f3)' }}
          >
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary leading-none">MOS Logix</div>
            <div className="text-xs text-text-muted mt-0.5">Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                style={{
                  background: active ? 'rgba(99,114,243,0.12)' : 'transparent',
                  color: active ? '#a5bbfc' : '#64748b',
                  borderLeft: active ? '3px solid #6272f3' : '3px solid transparent',
                }}
              >
                <Icon
                  size={16}
                  className="shrink-0 transition-colors"
                  style={{ color: active ? '#6272f3' : '#475569' }}
                />
                <span className="flex-1">{item.label}</span>
                {item.children && (
                  <ChevronRight size={12} className={`transition-transform ${active ? 'rotate-90' : ''}`} />
                )}
              </Link>
              {/* Sub-items */}
              {item.children && active && (
                <div className="ml-7 mt-1 space-y-0.5 border-l border-border-dim pl-3">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-2 py-1.5 text-xs rounded-md transition-colors"
                        style={{
                          color: childActive ? '#a5bbfc' : '#475569',
                          background: childActive ? 'rgba(99,114,243,0.08)' : 'transparent',
                        }}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-border-dim">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
          style={{ background: '#0d1117' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f56e7, #6272f3)' }}
          >
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{userEmail}</div>
            <div className="text-[10px] text-text-muted capitalize">{userRole}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-muted hover:text-danger hover:bg-danger/5 transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
