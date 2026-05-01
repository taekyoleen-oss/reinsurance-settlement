import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ConflictError } from '@/lib/api/error-handler'
import { requireBrokerRole } from '@/lib/api/auth'

/**
 * POST /api/account-currents/[id]/issue
 * rs_issue_account_current RPC: 스냅샷 저장 + 거래 잠금 + 상태 issued를 단일 트랜잭션으로
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireBrokerRole()
    const { id } = await params

    const { error } = await (supabase as any).rpc('rs_issue_account_current', {
      p_ac_id: id,
    })

    if (error) {
      // Postgres RAISE EXCEPTION 메시지를 ConflictError로 변환
      if (error.message?.includes('발행할 수 없는') || error.message?.includes('AC를 찾을')) {
        throw new ConflictError(error.message)
      }
      throw error
    }

    return NextResponse.json({ data: { id, status: 'issued' } })
  } catch (err) {
    return handleApiError(err)
  }
}
