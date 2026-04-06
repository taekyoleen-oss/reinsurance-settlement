import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'

/**
 * POST /api/account-currents/[id]/acknowledge
 * cedant_viewer / reinsurer_viewer만 가능
 */
export async function POST(
  _req: NextRequest,
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

    const allowedRoles = ['cedant_viewer', 'reinsurer_viewer', 'admin']
    if (!allowedRoles.includes(profile?.role ?? '')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    if (ac.status !== 'issued') {
      return NextResponse.json(
        { error: `발행된 상태가 아닙니다. 현재 상태: ${ac.status}` },
        { status: 409 }
      )
    }

    const data = await updateACStatus(id, 'acknowledged', user.id)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
