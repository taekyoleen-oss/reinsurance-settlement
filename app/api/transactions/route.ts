import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, createTransaction } from '@/lib/supabase/queries/transactions'
import { executeTreatyAllocation } from '@/lib/utils/treaty-allocation'
import { handleApiError } from '@/lib/api/error-handler'
import { withBrokerSchema } from '@/lib/api/handler'
import { TransactionCreateSchema } from '@/lib/api/schemas/transaction'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters = {
      counterpartyId:  searchParams.get('counterpartyId') ?? undefined,
      contractId:      searchParams.get('contractId') ?? undefined,
      status:          searchParams.get('status') ?? undefined,
      transactionType: searchParams.get('transactionType') ?? undefined,
      dateFrom:        searchParams.get('dateFrom') ?? undefined,
      dateTo:          searchParams.get('dateTo') ?? undefined,
      isDeleted:       searchParams.get('isDeleted') === 'true',
    }
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50') || 50))
    const { data, total } = await getTransactions(filters, { page, pageSize })
    return NextResponse.json({ data, meta: { total, page, pageSize } })
  } catch (err) {
    return handleApiError(err)
  }
}

export const POST = withBrokerSchema(TransactionCreateSchema, async (body, { user }) => {
  const { allocation_method, ...txData } = body

  // treaty + auto → is_allocation_parent=true
  const isAutoAllocation =
    txData.contract_type === 'treaty' && allocation_method === 'auto'

  const tx = await createTransaction({
    ...txData,
    created_by: user.id,
    is_allocation_parent: isAutoAllocation,
    allocation_type: isAutoAllocation ? 'auto' : (txData.allocation_type ?? 'manual'),
  })

  if (isAutoAllocation) {
    const childIds = await executeTreatyAllocation({
      parentTxId: tx.id,
      contractId: txData.contract_id,
      transactionDate: new Date(txData.transaction_date),
      totalAmount: txData.amount_original,
      currencyCode: txData.currency_code,
      transactionType: txData.transaction_type,
      direction: txData.direction,
      exchangeRate: tx.exchange_rate ?? 1,
      createdBy: user.id,
      description: txData.description ?? undefined,
      periodFrom: txData.period_from ?? undefined,
      periodTo: txData.period_to ?? undefined,
      dueDate: txData.due_date ?? undefined,
    })
    return NextResponse.json({ data: { ...tx, child_ids: childIds } }, { status: 201 })
  }

  return NextResponse.json({ data: tx }, { status: 201 })
})
