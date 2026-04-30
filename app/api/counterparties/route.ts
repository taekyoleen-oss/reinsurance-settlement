import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { searchParams } = new URL(req.url)
    const company_type = searchParams.get('company_type')

    let query = db
      .from('rs_counterparties')
      .select('*')
      .order('company_name_ko', { ascending: true })

    if (company_type) query = query.eq('company_type', company_type)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
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

    if (!body.company_name_ko?.trim()) {
      return NextResponse.json({ error: '회사명(한글)은 필수입니다.' }, { status: 400 })
    }

    const { created_by: _ignore, ...row } = body
    const { data, error } = await db
      .from('rs_counterparties')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
