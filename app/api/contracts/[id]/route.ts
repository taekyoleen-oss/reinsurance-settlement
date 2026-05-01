import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attachCedantSummaries } from '@/lib/supabase/attach-cedant'
import { handleApiError, NotFoundError } from '@/lib/api/error-handler'
import { withBrokerSchema } from '@/lib/api/handler'
import { ContractUpdateSchema } from '@/lib/api/schemas/contract'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const db = supabase as any
    const { data: row, error } = await db.from('rs_contracts').select('*').eq('id', id).single()
    if (error || !row) throw new NotFoundError('계약을 찾을 수 없습니다.')
    const [withCedant] = await attachCedantSummaries(db, [row as { cedant_id: string }])
    return NextResponse.json({ data: withCedant })
  } catch (err) {
    return handleApiError(err)
  }
}

export const PATCH = withBrokerSchema(ContractUpdateSchema, async (body, _auth, _req, ctx) => {
  const { id } = await ctx.params
  const supabase = await createClient()
  const db = supabase as any
  const { data, error } = await db
    .from('rs_contracts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data })
})
