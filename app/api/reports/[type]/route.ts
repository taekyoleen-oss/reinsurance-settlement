import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOutstandingByCounterparty, getAgingData } from '@/lib/supabase/queries/outstanding'
import { getAccountCurrents } from '@/lib/supabase/queries/account-currents'
import { getSettlements } from '@/lib/supabase/queries/settlements'
import { getTransactions } from '@/lib/supabase/queries/transactions'

/**
 * GET /api/reports/[type]
 * 보고서 데이터 (PDF/Excel 생성용)
 * type: outstanding | aging | account-currents | settlements | transactions
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { type } = await params
    const { searchParams } = new URL(req.url)

    let data: unknown

    switch (type) {
      case 'outstanding': {
        const counterpartyId = searchParams.get('counterpartyId') ?? undefined
        const currencyCode = searchParams.get('currencyCode') ?? undefined
        const contractId = searchParams.get('contractId') ?? undefined
        const cedantId = searchParams.get('cedant_id')?.trim() || undefined
        data = await getOutstandingByCounterparty(
          counterpartyId,
          currencyCode,
          contractId,
          cedantId
        )
        break
      }
      case 'aging': {
        const counterpartyId = searchParams.get('counterpartyId') ?? undefined
        const contractId = searchParams.get('contractId') ?? undefined
        const cedantId = searchParams.get('cedant_id')?.trim() || undefined
        data = await getAgingData(counterpartyId, contractId, cedantId)
        break
      }
      case 'account-currents': {
        data = await getAccountCurrents({
          contractId: searchParams.get('contractId') ?? undefined,
          counterpartyId: searchParams.get('counterpartyId') ?? undefined,
          status: searchParams.get('status') ?? undefined,
          dateFrom: searchParams.get('dateFrom') ?? undefined,
          dateTo: searchParams.get('dateTo') ?? undefined,
        })
        break
      }
      case 'settlements': {
        data = await getSettlements({
          counterpartyId: searchParams.get('counterpartyId') ?? undefined,
          matchStatus: searchParams.get('matchStatus') ?? undefined,
          dateFrom: searchParams.get('dateFrom') ?? undefined,
          dateTo: searchParams.get('dateTo') ?? undefined,
        })
        break
      }
      case 'transactions': {
        data = await getTransactions({
          contractId: searchParams.get('contractId') ?? undefined,
          counterpartyId: searchParams.get('counterpartyId') ?? undefined,
          dateFrom: searchParams.get('dateFrom') ?? undefined,
          dateTo: searchParams.get('dateTo') ?? undefined,
        })
        break
      }
      default:
        return NextResponse.json({ error: `알 수 없는 보고서 유형: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
