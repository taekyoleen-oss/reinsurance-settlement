import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/api/error-handler'
import { withUserAuth, withBrokerSchema } from '@/lib/api/handler'
import { CounterpartyUpdateSchema } from '@/lib/api/schemas/counterparty'

export const GET = withUserAuth(async (_auth, _req, ctx) => {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('rs_counterparties')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) throw new NotFoundError('거래상대방을 찾을 수 없습니다.')
  return NextResponse.json({ data })
})

export const PATCH = withBrokerSchema(CounterpartyUpdateSchema, async (body, _auth, _req, ctx) => {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('rs_counterparties')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data })
})
