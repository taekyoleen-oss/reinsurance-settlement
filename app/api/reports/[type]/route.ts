import { NextResponse } from 'next/server'
import { getOutstandingByCounterparty, getAgingData } from '@/lib/supabase/queries/outstanding'
import { getAccountCurrents } from '@/lib/supabase/queries/account-currents'
import { getSettlements } from '@/lib/supabase/queries/settlements'
import { getTransactions } from '@/lib/supabase/queries/transactions'
import { ValidationError } from '@/lib/api/error-handler'
import { withUserAuth } from '@/lib/api/handler'

/**
 * GET /api/reports/[type]
 * 보고서 데이터 (PDF/Excel 생성용)
 * type: outstanding | aging | account-currents | settlements | transactions
 */
export const GET = withUserAuth(async (_auth, req, ctx) => {
  const { type } = await ctx.params
  const { searchParams } = new URL(req.url)

  let data: unknown

  switch (type) {
    case 'outstanding': {
      // getOutstandingByCounterparty returns OutstandingResult[] (summary), use detail for CSV
      const detail = await getOutstandingByCounterparty(
        searchParams.get('counterpartyId') ?? undefined,
        searchParams.get('currencyCode') ?? undefined,
        searchParams.get('contractId') ?? undefined,
        searchParams.get('cedant_id')?.trim() || undefined
      )
      data = detail
      break
    }
    case 'aging': {
      data = await getAgingData(
        searchParams.get('counterpartyId') ?? undefined,
        searchParams.get('contractId') ?? undefined,
        searchParams.get('cedant_id')?.trim() || undefined
      )
      break
    }
    case 'account-currents': {
      const result = await getAccountCurrents({
        contractId: searchParams.get('contractId') ?? undefined,
        counterpartyId: searchParams.get('counterpartyId') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
      })
      data = result.data
      break
    }
    case 'settlements': {
      const result = await getSettlements({
        counterpartyId: searchParams.get('counterpartyId') ?? undefined,
        matchStatus: searchParams.get('matchStatus') ?? undefined,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
      })
      data = result.data
      break
    }
    case 'transactions': {
      const result = await getTransactions({
        contractId: searchParams.get('contractId') ?? undefined,
        counterpartyId: searchParams.get('counterpartyId') ?? undefined,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
      })
      data = result.data
      break
    }
    default:
      throw new ValidationError(`알 수 없는 보고서 유형: ${type}`)
  }

  return NextResponse.json({ data })
})
