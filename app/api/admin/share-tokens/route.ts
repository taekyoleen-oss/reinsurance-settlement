import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'

async function requireAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await db
    .from('rs_user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()
  if (!profile || profile.role !== 'admin' || !profile.is_active) return null
  return supabase
}

export async function GET() {
  try {
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('rs_share_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}
