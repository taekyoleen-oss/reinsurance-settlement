import { createClient } from '@/lib/supabase/server'

export type ReviewKind = 'confirm' | 'verify' | 'review' | 'remit' | 'verify-remit'

export interface ReviewMeta {
  user_id: string
  name: string
  email: string
  at: string // ISO timestamptz
}

export async function stampReviewMeta(userId: string): Promise<ReviewMeta> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 사용자 이름: rs_user_profiles
  const { data: profile } = await db
    .from('rs_user_profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single()

  // 이메일: auth.users (service role 필요 — server에서만 호출)
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)

  return {
    user_id: userId,
    name: profile?.full_name ?? '',
    email: authUser?.user?.email ?? '',
    at: new Date().toISOString(),
  }
}

// 거래 확정 payload 생성
export function buildConfirmPayload(meta: ReviewMeta) {
  return {
    review_status: 'confirmed' as const,
    confirmed_by: meta.user_id,
    confirmed_at: meta.at,
    confirmer_name: meta.name,
    confirmer_email: meta.email,
  }
}

// 검수(verify) payload 생성
export function buildVerifyPayload(meta: ReviewMeta, approved: boolean) {
  const review_status = approved ? ('verified' as const) : ('rejected' as const)
  return {
    review_status,
    verified_by: meta.user_id,
    verified_at: meta.at,
    verifier_name: meta.name,
    verifier_email: meta.email,
  }
}

// AC 검수(review) payload 생성
export function buildACReviewPayload(meta: ReviewMeta) {
  return {
    status: 'reviewed' as const,
    reviewed_by: meta.user_id,
    reviewed_at: meta.at,
    reviewer_name: meta.name,
    reviewer_email: meta.email,
  }
}

// 송금 완료 payload 생성
export function buildRemitPayload(meta: ReviewMeta) {
  return {
    remit_status: 'remitted' as const,
    remitted_by: meta.user_id,
    remitted_at: meta.at,
    remitter_name: meta.name,
    remitter_email: meta.email,
  }
}

// 송금 검수 payload 생성
export function buildVerifyRemitPayload(meta: ReviewMeta, approved: boolean) {
  const remit_status = approved ? ('verified' as const) : ('failed' as const)
  return {
    remit_status,
    reviewed_by: meta.user_id,
    reviewed_at: meta.at,
    reviewer_name: meta.name,
    reviewer_email: meta.email,
  }
}
