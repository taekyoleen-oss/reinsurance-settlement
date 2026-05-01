import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attachCedantSummaries } from '@/lib/supabase/attach-cedant'
import { handleApiError } from '@/lib/api/error-handler'
import { withBrokerSchema } from '@/lib/api/handler'
import { ContractCreateSchema } from '@/lib/api/schemas/contract'
import type { ContractRow } from '@/types/database'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { searchParams } = new URL(req.url)
    const status        = searchParams.get('status')
    const contract_type = searchParams.get('contract_type')
    const searchRaw     = searchParams.get('search')?.trim() ?? ''
    const searchLc      = searchRaw.toLowerCase()
    const cedant_id     = searchParams.get('cedant_id')?.trim() ?? ''
    const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const pageSize      = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50') || 50))

    let query = db.from('rs_contracts').select('*').order('created_at', { ascending: false })

    if (status)        query = query.eq('status', status)
    if (contract_type) query = query.eq('contract_type', contract_type)
    if (cedant_id)     query = query.eq('cedant_id', cedant_id)

    const { data, error } = await query
    if (error) throw error

    let rows = await attachCedantSummaries(db, (data ?? []) as ContractRow[])

    if (searchLc) {
      rows = rows.filter((c) => {
        const no    = String(c.contract_no ?? '').toLowerCase()
        const desc  = String(c.description ?? '').toLowerCase()
        const cko   = String(c.cedant?.company_name_ko ?? '').toLowerCase()
        const ccode = String(c.cedant?.company_code ?? '').toLowerCase()
        return no.includes(searchLc) || desc.includes(searchLc) ||
               cko.includes(searchLc) || ccode.includes(searchLc)
      })
    }

    const total = rows.length
    const from  = (page - 1) * pageSize
    const paged = rows.slice(from, from + pageSize)

    return NextResponse.json({ data: paged, meta: { total, page, pageSize } })
  } catch (err) {
    return handleApiError(err)
  }
}

// withBrokerSchema: 브로커 역할 인증 + zod 화이트리스트 검증으로 임의 컬럼 주입 방지
export const POST = withBrokerSchema(ContractCreateSchema, async (body, { user }) => {
  const supabase = await createClient()
  const db = supabase as any
  const { data, error } = await db
    .from('rs_contracts')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data }, { status: 201 })
})
