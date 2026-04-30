import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSettlements, createSettlement } from '@/lib/supabase/queries/settlements'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters = {
      counterpartyId: searchParams.get('counterpartyId') ?? undefined,
      currencyCode: searchParams.get('currencyCode') ?? undefined,
      matchStatus: searchParams.get('matchStatus') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    }
    const data = await getSettlements(filters)
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
    const settlement = await createSettlement({
      settlement_type: body.settlement_type,
      counterparty_id: body.counterparty_id,
      amount: Number(body.amount),
      currency_code: String(body.currency_code ?? 'KRW')
        .trim()
        .toUpperCase(),
      settlement_date: body.settlement_date,
      bank_reference: body.bank_reference ?? body.reference_no ?? null,
      notes: body.notes ?? null,
      created_by: user.id,
    })
    return NextResponse.json({ data: settlement }, { status: 201 })
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
