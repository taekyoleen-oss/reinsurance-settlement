import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'

/**
 * POST /api/account-currents/[id]/approve
 * broker_manager만 가능
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    // 역할 확인
    const { data: profileData } = await (supabase as any)
      .from('rs_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string } | null

    if (profile?.role !== 'broker_manager' && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    // 현재 상태 확인
    const { data: acData } = await (supabase as any)
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    if (ac.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `승인 대기 상태가 아닙니다. 현재 상태: ${ac.status}` },
        { status: 409 }
      )
    }

    const data = await updateACStatus(id, 'approved', user.id)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
