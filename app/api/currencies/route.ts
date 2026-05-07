import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'
import { z } from 'zod'

const CreateSchema = z.object({
  code: z.string().length(3).toUpperCase(),
  name_ko: z.string().min(1),
  name_en: z.string().min(1),
  symbol: z.string().min(1),
  decimal_digits: z.number().int().min(0).max(4).default(2),
  display_order: z.number().int().optional(),
})

async function requireBrokerInternal(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile } = await db
    .from('rs_user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()
  const internal = ['broker_technician', 'broker_manager', 'reviewer', 'admin']
  if (!profile || !internal.includes(profile.role) || !profile.is_active) return null
  return user
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('rs_currencies')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('code')

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const user = await requireBrokerInternal(supabase)
    if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db
      .from('rs_currencies')
      .insert({ ...parsed.data, created_by: user.id })
      .select()
      .single()
    if (error) {
      if (error.code === '23505')
        return NextResponse.json({ error: '이미 등록된 통화 코드입니다' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ currency: data }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
