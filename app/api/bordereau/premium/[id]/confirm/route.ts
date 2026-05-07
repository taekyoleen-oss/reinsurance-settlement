import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { stampReviewMeta, buildConfirmPayload } from '@/lib/utils/review-meta'

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

    const { data: row } = await db
      .from('rs_premium_bordereau')
      .select('review_status')
      .eq('id', id)
      .single()
    if (!row) return NextResponse.json({ error: '명세 없음' }, { status: 404 })
    if (row.review_status !== 'unconfirmed') {
      return NextResponse.json(
        { error: `현재 상태(${row.review_status})에서 확정 불가` },
        { status: 409 }
      )
    }

    const meta = await stampReviewMeta(user.id)
    const { data, error } = await db
      .from('rs_premium_bordereau')
      .update(buildConfirmPayload(meta))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ bordereau: data })
  } catch (err) {
    return handleApiError(err)
  }
}
