import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchSettlement } from '@/lib/supabase/queries/settlements'

/**
 * POST /api/settlements/match
 * 결제 ↔ 정산서 매칭
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { settlement_id, ac_id, matched_amount, tx_id } = await req.json()

    if (!settlement_id || !ac_id || matched_amount == null) {
      return NextResponse.json(
        { error: 'settlement_id, ac_id, matched_amount 필수' },
        { status: 400 }
      )
    }

    const match = await matchSettlement(
      settlement_id,
      ac_id,
      matched_amount,
      user.id,
      tx_id
    )
    return NextResponse.json({ data: match }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
