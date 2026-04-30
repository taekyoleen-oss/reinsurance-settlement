import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attachCedantSummaries } from '@/lib/supabase/attach-cedant'
import type { ContractRow } from '@/types/database'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const contract_type = searchParams.get('contract_type')
    const searchRaw = searchParams.get('search')?.trim() ?? ''
    const searchLc = searchRaw.toLowerCase()
    const cedant_id = searchParams.get('cedant_id')?.trim() ?? ''

    let query = db.from('rs_contracts').select('*').order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (contract_type) query = query.eq('contract_type', contract_type)
    if (cedant_id) query = query.eq('cedant_id', cedant_id)

    const { data, error } = await query
    if (error) throw error

    let rows = await attachCedantSummaries(db, (data ?? []) as ContractRow[])

    if (searchLc) {
      rows = rows.filter((c) => {
        const no = String(c.contract_no ?? '').toLowerCase()
        const desc = String(c.description ?? '').toLowerCase()
        const cko = String(c.cedant?.company_name_ko ?? '').toLowerCase()
        const ccode = String(c.cedant?.company_code ?? '').toLowerCase()
        return (
          no.includes(searchLc) ||
          desc.includes(searchLc) ||
          cko.includes(searchLc) ||
          ccode.includes(searchLc)
        )
      })
    }

    return NextResponse.json({ data: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const db = supabase as any
    const body = await req.json()

    const { data, error } = await db
      .from('rs_contracts')
      .insert({ ...body, created_by: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
