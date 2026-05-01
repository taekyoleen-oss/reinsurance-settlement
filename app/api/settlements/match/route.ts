import { NextResponse } from 'next/server'
import { matchSettlement } from '@/lib/supabase/queries/settlements'
import { withBrokerSchema } from '@/lib/api/handler'
import { SettlementMatchSchema } from '@/lib/api/schemas/settlement'

/** POST /api/settlements/match — 결제 ↔ 정산서 매칭 */
export const POST = withBrokerSchema(SettlementMatchSchema, async (body, { user }) => {
  const match = await matchSettlement(
    body.settlement_id,
    body.ac_id,
    body.matched_amount,
    user.id,
    body.tx_id ?? undefined
  )
  return NextResponse.json({ data: match }, { status: 201 })
})
