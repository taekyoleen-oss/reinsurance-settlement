import { NextRequest, NextResponse } from 'next/server'
import {
  getOutstandingByCounterparty,
  getAgingData,
  getOutstandingDetailData,
} from '@/lib/supabase/queries/outstanding'
import { withBrokerAuth } from '@/lib/api/handler'

export const dynamic = 'force-dynamic'

export const GET = withBrokerAuth(async (_auth, req) => {
  const { searchParams } = new URL(req.url)
  const counterpartyId = searchParams.get('counterpartyId') ?? undefined
  const currencyCode = searchParams.get('currencyCode') ?? undefined
  const contractId = searchParams.get('contractId') ?? undefined
  const cedantId = searchParams.get('cedant_id')?.trim() || undefined
  const type = searchParams.get('type')

  if (type === 'aging') {
    const aging = await getAgingData(counterpartyId, contractId, cedantId)
    return NextResponse.json(aging)
  }

  if (type === 'detail') {
    const detail = await getOutstandingDetailData(
      counterpartyId,
      currencyCode,
      contractId,
      cedantId
    )
    return NextResponse.json({ data: detail })
  }

  const outstanding = await getOutstandingByCounterparty(
    counterpartyId,
    currencyCode,
    contractId,
    cedantId
  )
  return NextResponse.json({ data: outstanding })
})
