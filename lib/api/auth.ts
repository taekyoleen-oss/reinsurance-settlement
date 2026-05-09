import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { AuthError, ForbiddenError } from './error-handler'
import type { User } from '@supabase/supabase-js'

export interface AuthContext {
  user: User
  supabase: Awaited<ReturnType<typeof createClient>>
}

export interface BrokerAuthContext extends AuthContext {
  role: string
}

export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new AuthError()
  return { user, supabase }
}

async function getRole(userId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (adminClient as any)
    .from('rs_user_profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
  const role = (profile as { role: string } | null)?.role
  if (!role) throw new ForbiddenError()
  return role
}

export async function requireBrokerRole(): Promise<BrokerAuthContext> {
  const { user, supabase } = await requireUser()
  const role = await getRole(user.id)
  const BROKER_ROLES = ['broker_technician', 'broker_staff', 'broker_manager', 'reviewer', 'admin']
  if (!BROKER_ROLES.includes(role)) throw new ForbiddenError()
  return { user, supabase, role }
}

/** 허용 역할 목록 중 하나여야 하는 경우 (approve, acknowledge 등 특수 역할) */
export async function requireRoles(allowedRoles: string[]): Promise<BrokerAuthContext> {
  const { user, supabase } = await requireUser()
  const role = await getRole(user.id)
  if (!allowedRoles.includes(role)) throw new ForbiddenError()
  return { user, supabase, role }
}
