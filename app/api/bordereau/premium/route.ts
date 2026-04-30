import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getPremiumBordereau,
  insertPremiumBordereau,
  insertPremiumBordereauBatch,
} from '@/lib/supabase/queries/bordereau'
import type { BordereauFilters } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters: BordereauFilters = {
      contractId: searchParams.get('contractId') ?? undefined,
      periodYyyyqn: searchParams.get('periodYyyyqn') ?? undefined,
      validationStatus: searchParams.get('validationStatus') ?? undefined,
      entryType: searchParams.get('entryType') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    }
    const data = await getPremiumBordereau(filters)
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

    // 계약 조회 (검증에 필요)
    const { data: contract, error: contractError } = await supabase
      .from('rs_contracts')
      .select('*')
      .eq('id', body.contract_id ?? body[0]?.contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 배열이면 일괄 저장, 단일 객체면 개별 저장
    if (Array.isArray(body)) {
      const rows = body.map((r: any) => ({ ...r, created_by: user.id }))
      const result = await insertPremiumBordereauBatch(rows, contract)
      return NextResponse.json({ data: result }, { status: 201 })
    } else {
      const row = await insertPremiumBordereau({ ...body, created_by: user.id }, contract)
      return NextResponse.json({ data: row }, { status: 201 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
