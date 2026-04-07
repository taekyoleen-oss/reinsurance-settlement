# 스킬: share-token-manager

## 목적
만료형 토큰 URL 생성·검증·로그 기록 로직을 제공한다.

## 핵심 규칙
- 토큰 URL은 해당 AC 전체 공개 (이미 수재사별 슬라이스된 단일 AC)
- `adminClient`(SERVICE_ROLE_KEY)로 서버사이드 처리 — RLS 우회 없음
- 만료: 기본 30일 (`SHARE_TOKEN_EXPIRY_DAYS` 환경변수)
- 접근 로그: IP + user_agent + action 기록

## 구현

### `lib/supabase/queries/share-tokens.ts`

```typescript
import { adminClient } from '@/lib/supabase/admin'

export async function createShareToken(params: {
  acId: string
  createdBy: string
  notes?: string
  expiryDays?: number
}): Promise<string> {
  const expiryDays = params.expiryDays
    ?? parseInt(process.env.SHARE_TOKEN_EXPIRY_DAYS ?? '30')
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const { error } = await adminClient
    .from('rs_share_tokens')
    .insert({
      token,
      target_type: 'account_current',
      target_id: params.acId,
      created_by: params.createdBy,
      expires_at: expiresAt.toISOString(),
      notes: params.notes,
    })

  if (error) throw error
  return token
}

export async function validateToken(token: string): Promise<{
  isValid: boolean
  acId?: string
}> {
  const { data } = await adminClient
    .from('rs_share_tokens')
    .select('target_id, expires_at, revoked')
    .eq('token', token)
    .single()

  if (!data || data.revoked || new Date(data.expires_at) < new Date()) {
    return { isValid: false }
  }
  return { isValid: true, acId: data.target_id }
}

export async function logTokenAccess(params: {
  tokenId: string
  ipAddress: string
  userAgent: string
  action: 'view' | 'download_pdf'
}): Promise<void> {
  await adminClient.from('rs_share_token_logs').insert({
    token_id: params.tokenId,
    accessed_at: new Date().toISOString(),
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    action: params.action,
  })
}

export async function revokeToken(tokenId: string, revokedBy: string): Promise<void> {
  await adminClient
    .from('rs_share_tokens')
    .update({ revoked: true, revoked_by: revokedBy, revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
}
```

### Route Handler: `app/api/account-currents/[id]/share/route.ts`

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const token = await createShareToken({
    acId: params.id,
    createdBy: user.id,
    notes: body.notes,
    expiryDays: body.expiryDays,
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return Response.json({ token, url: `${baseUrl}/share/${token}` })
}
```

### 토큰 URL 페이지: `app/share/[token]/page.tsx`

```typescript
import { validateToken, logTokenAccess } from '@/lib/supabase/queries/share-tokens'
import { headers } from 'next/headers'

export default async function SharePage({ params }: { params: { token: string } }) {
  const { isValid, acId } = await validateToken(params.token)

  if (!isValid) {
    return <TokenExpiredPage />
  }

  // 접근 로그 기록
  const hdrs = await headers()
  await logTokenAccess({
    tokenId: params.token,
    ipAddress: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    action: 'view',
  })

  // AC 데이터 조회 (adminClient 사용)
  // ...AccountCurrentViewer 렌더링
}
```
