import { NextRequest, NextResponse } from 'next/server'
import {
  getOutstandingByCounterparty,
  getAgingData,
  getOutstandingDetailData,
} from '@/lib/supabase/queries/outstanding'
import { handleApiError } from '@/lib/api/error-handler'

export const dynamic = 'force-dynamic'

/**
 * GET /api/outstanding              → 통화별 집계 (대시보드 KPI 카드)
 * GET /api/outstanding?type=aging   → Aging 분석 테이블
 * GET /api/outstanding?type=detail  → 거래별 상세 (미청산 페이지 테이블)
 */
export async function GET(req: NextRequest) {
  try {
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

    // 기본: 통화별 집계 (KPI 카드)
    const outstanding = await getOutstandingByCounterparty(
      counterpartyId,
      currencyCode,
      contractId,
      cedantId
    )
    return NextResponse.json({ data: outstanding })
  } catch (err) {
    return handleApiError(err)
  }
}
