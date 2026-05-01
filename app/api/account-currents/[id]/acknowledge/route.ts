import { NextRequest, NextResponse } from 'next/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'
import { handleApiError, NotFoundError, ConflictError } from '@/lib/api/error-handler'
import { withRolesAuth } from '@/lib/api/handler'

/** POST /api/account-currents/[id]/acknowledge — cedant_viewer / reinsurer_viewer / admin만 가능 */
export const POST = withRolesAuth(
  ['cedant_viewer', 'reinsurer_viewer', 'admin'],
  async ({ user, supabase }, _req, ctx) => {
    const { id } = await ctx.params
    const db = supabase as any

    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) throw new NotFoundError('정산서를 찾을 수 없습니다.')
    if (ac.status !== 'issued') {
      throw new ConflictError(`발행된 상태가 아닙니다. 현재 상태: ${ac.status}`)
    }

    const data = await updateACStatus(id, 'acknowledged', user.id)
    return NextResponse.json({ data })
  }
)

export type { NextRequest }
