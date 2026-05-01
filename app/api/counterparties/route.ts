import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'
import { withBrokerSchema } from '@/lib/api/handler'
import { CounterpartyCreateSchema } from '@/lib/api/schemas/counterparty'

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
  } catch (err) {
    return handleApiError(err)
  }
}

export const POST = withBrokerSchema(CounterpartyCreateSchema, async (body) => {
  const supabase = await createClient()
  const db = supabase as any
  const { data, error } = await db
    .from('rs_counterparties')
    .insert(body)
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data }, { status: 201 })
})
