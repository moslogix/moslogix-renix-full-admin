import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { ReconnectBanner } from '@/components/layout/ReconnectBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string | null } | null; error: unknown }

  const unreadCount = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .then(({ count }) => count ?? 0)

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <ReconnectBanner />
      <Sidebar
        userEmail={user.email ?? ''}
        userRole={profile?.role ?? 'admin'}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
