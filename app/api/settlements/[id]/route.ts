import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data, error } = await db
      .from('rs_settlements')
      .select('*, counterparty:rs_counterparties(company_name_ko)')
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: '결제 없음' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}
