import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  contract_match_status: z.enum(['matched', 'mismatch', 'waived', 'pending']),
  review_notes: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data, error } = await db
      .from('rs_transactions')
      .update({
        contract_match_status: parsed.data.contract_match_status,
        ...(parsed.data.review_notes && { review_notes: parsed.data.review_notes }),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (err) {
    return handleApiError(err)
  }
}
