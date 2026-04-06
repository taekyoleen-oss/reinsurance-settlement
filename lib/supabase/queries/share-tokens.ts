import { adminClient } from '@/lib/supabase/admin'
import type { ShareTokenRow, ShareTokenInsert, ShareTokenLogInsert, TokenAction } from '@/types/database'
import { randomUUID } from 'crypto'

/**
 * 공유 토큰 생성
 * @param targetType 대상 타입 (현재: 'account_current')
 * @param targetId 대상 ID
 * @param expiresInDays 만료 일수 (기본 30일)
 */
export async function createShareToken(
  targetType: 'account_current',
  targetId: string,
  createdBy: string,
  expiresInDays: number = 30,
  notes?: string
): Promise<ShareTokenRow> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const insert: ShareTokenInsert = {
    token: randomUUID(),
    target_type: targetType,
    target_id: targetId,
    created_by: createdBy,
    expires_at: expiresAt.toISOString(),
    revoked: false,
    notes: notes ?? null,
  }

  const db = adminClient as any
  const { data, error } = await db
    .from('rs_share_tokens')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return data as ShareTokenRow
}

/**
 * 토큰 검증 — 만료/취소된 경우 null 반환
 */
export async function validateToken(token: string): Promise<ShareTokenRow | null> {
  const db = adminClient as any
  const { data, error } = await db
    .from('rs_share_tokens')
    .select('*')
    .eq('token', token)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data as ShareTokenRow
}

/**
 * 토큰 취소
 */
export async function revokeToken(tokenId: string, revokedBy: string): Promise<void> {
  const db = adminClient as any
  const { error } = await db
    .from('rs_share_tokens')
    .update({
      revoked: true,
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', tokenId)

  if (error) throw error
}

/**
 * 토큰 접근 로그 기록
 */
export async function logTokenAccess(
  tokenId: string,
  action: TokenAction,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const insert: ShareTokenLogInsert = {
    token_id: tokenId,
    action,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  }

  await (adminClient as any).from('rs_share_token_logs').insert(insert)
}
