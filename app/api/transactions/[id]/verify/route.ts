import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { stampReviewMeta, buildVerifyPayload } from '@/lib/utils/review-meta'
import { z } from 'zod'

const Schema = z.object({ approved: z.boolean(), notes: z.string().optional() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    // reviewer 이상 권한 확인
    const { data: profile } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (!['reviewer', 'broker_manager', 'admin'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: '검수 권한 없음 (reviewer 이상 필요)' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data: tx } = await db
      .from('rs_transactions')
      .select('review_status, is_locked')
      .eq('id', id)
      .single()
    if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
    if (tx.review_status !== 'confirmed') {
      return NextResponse.json(
        { error: `확정된 거래만 검수 가능 (현재: ${tx.review_status})` },
        { status: 409 }
      )
    }

    const meta = await stampReviewMeta(user.id)
    const payload = {
      ...buildVerifyPayload(meta, parsed.data.approved),
      ...(parsed.data.notes && { review_notes: parsed.data.notes }),
    }
    const { data, error } = await db
      .from('rs_transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (err) {
    return handleApiError(err)
  }
}
