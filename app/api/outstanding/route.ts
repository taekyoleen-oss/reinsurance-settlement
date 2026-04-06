import { NextRequest, NextResponse } from 'next/server'
import {
  getOutstandingByCounterparty,
  getAgingData,
} from '@/lib/supabase/queries/outstanding'

/**
 * GET /api/outstanding
 * 미청산 잔액 조회 + Aging 분석
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const counterpartyId = searchParams.get('counterpartyId') ?? undefined
    const currencyCode = searchParams.get('currencyCode') ?? undefined
    const includeAging = searchParams.get('includeAging') === 'true'

    const outstanding = await getOutstandingByCounterparty(counterpartyId, currencyCode)

    if (includeAging) {
      const aging = await getAgingData(counterpartyId)
      return NextResponse.json({ data: { outstanding, aging } })
    }

    return NextResponse.json({ data: outstanding })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
