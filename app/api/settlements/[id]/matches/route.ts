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
      .from('rs_settlement_matches')
      .select('*, account_current:rs_account_currents(ac_no)')
      .eq('settlement_id', id)
      .order('matched_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}
