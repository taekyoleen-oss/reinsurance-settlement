import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAccountCurrents,
  createAccountCurrent,
} from '@/lib/supabase/queries/account-currents'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters = {
      contractId: searchParams.get('contractId') ?? undefined,
      counterpartyId: searchParams.get('counterpartyId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      periodType: searchParams.get('periodType') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    }
    const data = await getAccountCurrents(filters)
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
    const { ac, isDuplicate } = await createAccountCurrent({
      ...body,
      created_by: user.id,
    })

    return NextResponse.json({ data: ac, isDuplicate }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
