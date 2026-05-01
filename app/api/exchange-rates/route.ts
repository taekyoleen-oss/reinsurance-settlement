import { NextRequest, NextResponse } from 'next/server'
import { getAllRates, createRate } from '@/lib/supabase/queries/exchange-rates'
import { handleApiError } from '@/lib/api/error-handler'
import { withBrokerSchema } from '@/lib/api/handler'
import { ExchangeRateCreateSchema } from '@/lib/api/schemas/exchange-rate'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fromCurrency = searchParams.get('fromCurrency') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined

    const data = await getAllRates(fromCurrency, dateFrom, dateTo)
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

export const POST = withBrokerSchema(ExchangeRateCreateSchema, async (body, { user }) => {
  const rate = await createRate({ ...body, created_by: user.id })
  return NextResponse.json({ data: rate }, { status: 201 })
})
