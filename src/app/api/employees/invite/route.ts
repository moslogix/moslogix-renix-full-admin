import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, role, full_name } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get current user and their store_id
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const { data: { user } } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.store_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 400 })
    }

    if (!['store_admin', 'manager'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create auth user via admin API
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: newUser.user.id,
      full_name,
      role,
      store_id: callerProfile.store_id,
      is_active: true,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Send invitation email via Supabase magic link
    await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { full_name, role } },
    })

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
