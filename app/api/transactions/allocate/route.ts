import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getEffectiveShares,
  allocateTreatyTransaction,
} from '@/lib/utils/treaty-allocation'
import { validateExchangeRate } from '@/lib/utils/exchange-rate'

/**
 * POST /api/transactions/allocate
 * Treaty 자동 배분 미리보기 (DB 저장 없음)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { contract_id, transaction_date, amount_original, currency_code } =
      await req.json()

    const rate = await validateExchangeRate(currency_code, new Date(transaction_date))
    const shares = await getEffectiveShares(contract_id, new Date(transaction_date))
    const allocated = allocateTreatyTransaction(amount_original, shares)

    return NextResponse.json({
      data: {
        exchange_rate: rate,
        shares,
        allocated,
        total: allocated.reduce((s, a) => s + a.amount, 0),
      },
    })
  } catch (err: any) {
    if (err.code === 'EXCHANGE_RATE_NOT_FOUND') {
      return NextResponse.json(
        { error: '환율 미등록', currency: err.currency, date: err.date },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
