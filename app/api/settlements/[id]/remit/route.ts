import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { stampReviewMeta, buildRemitPayload } from '@/lib/utils/review-meta'

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

    const { data: settlement } = await db
      .from('rs_settlements')
      .select('remit_status')
      .eq('id', id)
      .single()
    if (!settlement) return NextResponse.json({ error: '결제 없음' }, { status: 404 })
    if (settlement.remit_status !== 'pending') {
      return NextResponse.json(
        { error: `현재 상태(${settlement.remit_status})에서 송금 완료 불가` },
        { status: 409 }
      )
    }

    const meta = await stampReviewMeta(user.id)
    const { data, error } = await db
      .from('rs_settlements')
      .update(buildRemitPayload(meta))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ settlement: data })
  } catch (err) {
    return handleApiError(err)
  }
}
