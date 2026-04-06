import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'
import { snapshotACItems } from '@/lib/utils/account-current'

/**
 * POST /api/account-currents/[id]/issue
 * 발행: 스냅샷 저장 + 거래 is_locked=true
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const db = supabase as any
    const { data: profileData } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string } | null

    if (!profile?.role?.startsWith('broker_') && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status, contract_id, counterparty_id, period_from, period_to')
      .eq('id', id)
      .single()
    const ac = acData as {
      status: string
      contract_id: string
      counterparty_id: string
      period_from: string
      period_to: string
    } | null

    if (!ac) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    if (!['approved', 'draft'].includes(ac.status)) {
      return NextResponse.json(
        { error: `발행할 수 없는 상태입니다. 현재 상태: ${ac.status}` },
        { status: 409 }
      )
    }

    // 1) 스냅샷 저장
    await snapshotACItems(id)

    // 2) 연결된 거래 is_locked=true
    await db
      .from('rs_transactions')
      .update({ is_locked: true })
      .eq('contract_id', ac.contract_id)
      .eq('counterparty_id', ac.counterparty_id)
      .eq('is_allocation_parent', false)
      .eq('is_deleted', false)
      .in('status', ['confirmed', 'billed'])
      .gte('period_from', ac.period_from)
      .lte('period_to', ac.period_to)

    // 3) 상태 → issued
    const data = await updateACStatus(id, 'issued', user.id)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
