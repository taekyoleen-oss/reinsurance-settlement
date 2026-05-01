import { NextResponse } from 'next/server'
import { getSettlements, createSettlement } from '@/lib/supabase/queries/settlements'
import { withBrokerAuth, withBrokerSchema } from '@/lib/api/handler'
import { SettlementCreateSchema } from '@/lib/api/schemas/settlement'

export const GET = withBrokerAuth(async (_auth, req) => {
  const { searchParams } = new URL(req.url)
  const filters = {
    counterpartyId: searchParams.get('counterpartyId') ?? undefined,
    currencyCode: searchParams.get('currencyCode') ?? undefined,
    matchStatus: searchParams.get('matchStatus') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  }
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50') || 50))
  const { data, total } = await getSettlements(filters, { page, pageSize })
  return NextResponse.json({ data, meta: { total, page, pageSize } })
})

export const POST = withBrokerSchema(SettlementCreateSchema, async (body, { user }) => {
  const settlement = await createSettlement({
    settlement_type: body.settlement_type,
    counterparty_id: body.counterparty_id,
    amount: body.amount,
    currency_code: body.currency_code.trim().toUpperCase(),
    settlement_date: body.settlement_date,
    bank_reference: body.bank_reference ?? null,
    notes: body.notes ?? null,
    created_by: user.id,
  })
  return NextResponse.json({ data: settlement }, { status: 201 })
})
