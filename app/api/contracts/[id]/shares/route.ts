import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('rs_contract_shares')
      .select(`
        id, reinsurer_id, signed_line, order_of_priority,
        effective_from, effective_to,
        rs_counterparties!reinsurer_id (company_name)
      `)
      .eq('contract_id', id)
      .order('order_of_priority', { ascending: true })

    if (error) throw error

    const shares = (data ?? []).map((s: any) => ({
      id: s.id,
      reinsurer_id: s.reinsurer_id,
      reinsurer_name: s.rs_counterparties?.company_name,
      signed_line: s.signed_line,
      order_of_priority: s.order_of_priority,
      effective_from: s.effective_from,
      effective_to: s.effective_to,
    }))

    return NextResponse.json({ data: shares })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await (supabase as any)
      .from('rs_contract_shares')
      .insert({ ...body, contract_id: id, created_by: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
