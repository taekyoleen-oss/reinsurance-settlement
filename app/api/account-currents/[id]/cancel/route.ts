import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'

/**
 * POST /api/account-currents/[id]/cancel
 * 취소: DB 트리거가 is_locked=false 처리
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const db = supabase as any
    const { data: profileData } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string } | null

    if (!profile?.role?.startsWith('broker_') && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    if (ac.status === 'cancelled') {
      return NextResponse.json({ error: '이미 취소된 정산서입니다.' }, { status: 409 })
    }

    const data = await updateACStatus(id, 'cancelled', user.id, {
      notes: body.reason ?? null,
    })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
