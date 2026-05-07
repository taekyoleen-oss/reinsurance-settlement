import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { stampReviewMeta, buildACReviewPayload } from '@/lib/utils/review-meta'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (!['reviewer', 'broker_manager', 'admin'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: '검수 권한 없음 (reviewer 이상)' }, { status: 403 })
    }

    const { data: ac } = await db.from('rs_account_currents').select('status').eq('id', id).single()
    if (!ac) return NextResponse.json({ error: '정산서 없음' }, { status: 404 })
    if (ac.status !== 'approved') {
      return NextResponse.json(
        { error: `승인된 정산서만 검수 가능 (현재: ${ac.status})` },
        { status: 409 }
      )
    }

    const meta = await stampReviewMeta(user.id)
    const { data, error } = await db
      .from('rs_account_currents')
      .update(buildACReviewPayload(meta))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ account_current: data })
  } catch (err) {
    return handleApiError(err)
  }
}
