import { NextRequest, NextResponse } from 'next/server'
import {
  getOutstandingByCounterparty,
  getAgingData,
  getOutstandingDetailData,
} from '@/lib/supabase/queries/outstanding'

/**
 * GET /api/outstanding              → 통화별 집계 (대시보드 KPI 카드)
 * GET /api/outstanding?type=aging   → Aging 분석 테이블
 * GET /api/outstanding?type=detail  → 거래별 상세 (미청산 페이지 테이블)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const counterpartyId = searchParams.get('counterpartyId') ?? undefined
    const currencyCode   = searchParams.get('currencyCode')   ?? undefined
    const type           = searchParams.get('type')

    if (type === 'aging') {
      const aging = await getAgingData(counterpartyId)
      return NextResponse.json(aging)
    }

    if (type === 'detail') {
      const detail = await getOutstandingDetailData(counterpartyId, currencyCode)
      return NextResponse.json({ data: detail })
    }

    // 기본: 통화별 집계 (KPI 카드)
    const outstanding = await getOutstandingByCounterparty(counterpartyId, currencyCode)
    return NextResponse.json({ data: outstanding })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
