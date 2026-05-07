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

    const { data: tx } = await db
      .from('rs_transactions')
      .select('review_status, is_locked')
      .eq('id', id)
      .single()
    if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
    if (tx.is_locked) return NextResponse.json({ error: '잠긴 거래' }, { status: 409 })
    if (tx.review_status !== 'unconfirmed') {
      return NextResponse.json(
        { error: `현재 상태(${tx.review_status})에서 확정 불가` },
        { status: 409 }
      )
    }

    const meta = await stampReviewMeta(user.id)
    const { data, error } = await db
      .from('rs_transactions')
      .update(buildConfirmPayload(meta))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (err) {
    return handleApiError(err)
  }
}
