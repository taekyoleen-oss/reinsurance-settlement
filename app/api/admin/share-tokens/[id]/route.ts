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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await requireAdmin()
    if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error } = await db
      .from('rs_share_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
