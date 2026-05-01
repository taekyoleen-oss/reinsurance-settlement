import { NextResponse } from 'next/server'
import { getAccountCurrents, createAccountCurrent } from '@/lib/supabase/queries/account-currents'
import { withBrokerAuth, withBrokerSchema } from '@/lib/api/handler'
import { ACCreateSchema } from '@/lib/api/schemas/account-current'

export const GET = withBrokerAuth(async (_auth, req) => {
  const { searchParams } = new URL(req.url)
  const filters = {
    contractId: searchParams.get('contractId') ?? undefined,
    cedantId: searchParams.get('cedant_id')?.trim() || undefined,
    counterpartyId: searchParams.get('counterpartyId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    periodType: searchParams.get('periodType') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  }
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50') || 50))
  const { data, total } = await getAccountCurrents(filters, { page, pageSize })
  return NextResponse.json({ data, meta: { total, page, pageSize } })
})

export const POST = withBrokerSchema(ACCreateSchema, async (body, { user }) => {
  const { ac, isDuplicate } = await createAccountCurrent({
    ...body,
    created_by: user.id,
  })
  return NextResponse.json({ data: ac, isDuplicate }, { status: 201 })
})
