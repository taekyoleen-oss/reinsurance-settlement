import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attachCedantSummaries } from '@/lib/supabase/attach-cedant'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const db = supabase as any
    const { data: row, error } = await db.from('rs_contracts').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    const [withCedant] = await attachCedantSummaries(db, [row as { cedant_id: string }])
    return NextResponse.json({ data: withCedant })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
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
      .from('rs_contracts')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
