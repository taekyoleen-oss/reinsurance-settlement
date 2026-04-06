import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, createTransaction } from '@/lib/supabase/queries/transactions'
import { executeTreatyAllocation } from '@/lib/utils/treaty-allocation'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters = {
      counterpartyId: searchParams.get('counterpartyId') ?? undefined,
      contractId: searchParams.get('contractId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      transactionType: searchParams.get('transactionType') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      isDeleted: searchParams.get('isDeleted') === 'true',
    }
    const data = await getTransactions(filters)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const body = await req.json()
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
        description: txData.description,
        periodFrom: txData.period_from,
        periodTo: txData.period_to,
        dueDate: txData.due_date,
      })
      return NextResponse.json({ data: { ...tx, child_ids: childIds } }, { status: 201 })
    }

    return NextResponse.json({ data: tx }, { status: 201 })
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
