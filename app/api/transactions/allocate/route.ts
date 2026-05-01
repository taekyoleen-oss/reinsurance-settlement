import { NextResponse } from 'next/server'
import {
  getEffectiveShares,
  allocateTreatyTransaction,
} from '@/lib/utils/treaty-allocation'
import { validateExchangeRate } from '@/lib/utils/exchange-rate'
import { withBrokerSchema } from '@/lib/api/handler'
import { AllocatePreviewSchema } from '@/lib/api/schemas/transaction'

/** POST /api/transactions/allocate — Treaty 자동 배분 미리보기 (DB 저장 없음) */
export const POST = withBrokerSchema(AllocatePreviewSchema, async (body) => {
  const { contract_id, transaction_date, amount_original, currency_code } = body

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
})
