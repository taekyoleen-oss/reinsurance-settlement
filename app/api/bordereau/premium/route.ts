import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getPremiumBordereau,
  insertPremiumBordereau,
  insertPremiumBordereauBatch,
} from '@/lib/supabase/queries/bordereau'
import { handleApiError, NotFoundError } from '@/lib/api/error-handler'
import { withUserAuth } from '@/lib/api/handler'
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
  } catch (err) {
    return handleApiError(err)
  }
}

// 배열/단일 객체 혼합 바디는 zod 스키마 대신 기존 파이프라인 유지
export const POST = withUserAuth(async ({ user }, req) => {
  const body = await req.json()
  const supabase = await createClient()

  const contractId = Array.isArray(body) ? body[0]?.contract_id : body.contract_id
  const { data: contract, error: contractError } = await supabase
    .from('rs_contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) throw new NotFoundError('계약을 찾을 수 없습니다.')

  if (Array.isArray(body)) {
    const rows = body.map((r: any) => ({ ...r, created_by: user.id }))
    const result = await insertPremiumBordereauBatch(rows, contract)
    return NextResponse.json({ data: result }, { status: 201 })
  }

  const row = await insertPremiumBordereau({ ...body, created_by: user.id }, contract)
  return NextResponse.json({ data: row }, { status: 201 })
})
