import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'
import { listUsers, createUser } from '@/lib/supabase/queries/users'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([
    'broker_technician',
    'broker_manager',
    'reviewer',
    'cedant_viewer',
    'reinsurer_viewer',
    'admin',
  ]),
  full_name: z.string().min(1),
  company_id: z.string().uuid().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await db
    .from('rs_user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()
  if (!profile || profile.role !== 'admin' || !profile.is_active) return null
  return user
}

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const body = await req.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { email, password, role, full_name, company_id } = parsed.data
    const user = await createUser({
      email,
      password,
      role,
      fullName: full_name,
      companyId: company_id,
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
