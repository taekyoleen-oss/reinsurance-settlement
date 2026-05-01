# 아키텍처 설명

## RLS 모델

모든 테이블은 `rs_` 접두어를 사용하며 Supabase Row Level Security가 적용되어 있습니다.

### 역할 해석 흐름

```
JWT → supabase.auth.getUser() → rs_user_profiles.role
```

브로커 내부 페이지(`/broker`)의 모든 mutating 라우트는 `requireBrokerRole()` 헬퍼로 보호됩니다. 외부 뷰어(`/external`)는 `cedant_viewer` / `reinsurer_viewer` 역할만 허용합니다.

### 테이블별 RLS 원칙

| 테이블 | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|---------------------|
| `rs_contracts` | broker_* + 연결된 cedant_viewer | broker_* |
| `rs_transactions` | broker_* + 연결된 cedant_viewer | broker_* |
| `rs_account_currents` | broker_* + counterparty viewer | broker_* |
| `rs_settlements` | broker_* | broker_* |
| `rs_share_tokens` | public (토큰 검증용) | broker_* |

---

## 토큰 공유 흐름

```
브로커 → POST /api/account-currents/{id}/share
       → rs_share_tokens 레코드 생성 (expires_at = 30일)
       → 응답: { token, share_url }

외부 사용자 → GET /share/{token}
            → GET /api/share/{token}
            → validateToken() → adminClient로 AC 조회
            → logTokenAccess() (감사 로그)
```

토큰 URL은 인증 없이 접근 가능하지만, 만료일과 조회 횟수 제한이 DB에서 관리됩니다.

---

## 트랜잭션 단위

### AC 발행 (`rs_issue_account_current`)

```sql
BEGIN
  1. SELECT rs_account_currents FOR UPDATE  -- advisory lock
  2. UPDATE rs_transactions SET is_locked = true
  3. INSERT INTO rs_account_current_snapshots
  4. UPDATE rs_account_currents SET status = 'issued'
COMMIT
```

중간 실패 시 전체 롤백 → 거래 lock 원복 보장.

### 부모 거래 + Treaty 배분 (`rs_create_parent_with_allocations`)

```sql
BEGIN
  1. INSERT INTO rs_transactions (is_allocation_parent = true)
  2. INSERT INTO rs_transactions[] (allocation children)
  3. 환율 검증 (422 early return)
COMMIT
```

---

## 페이지 데이터 로딩 패턴

```
RSC Page (async)
  └── getInitialData()  ← lib/supabase/server.ts
        └── Promise.allSettled([contracts, counterparties])
              ↓ initialData props
  Client Island ('use client')
        └── useSWR(url, { fallbackData: initialData })
              ← 이후 업데이트는 SWR 캐시 공유
```

SWR dedupingInterval: contracts/counterparties 60s, currencies 300s.

---

## Outstanding / Aging 집계

JS Map 집계 대신 Postgres RPC 함수로 DB 레벨에서 처리합니다:

| 함수 | 설명 |
|------|------|
| `rs_calc_outstanding(...)` | 통화별 receivable/payable/net |
| `rs_calc_aging(...)` | 거래상대방별 에이징 버킷 집계 |
| `rs_calc_outstanding_detail(...)` | 상세 행 + 에이징 버킷 |

모두 `SECURITY DEFINER`로 정의되어 호출자 RLS 정책과 무관하게 동작합니다. 함수 실행 권한은 `anon`, `authenticated` 역할에만 부여됩니다.

---

## 응답 포맷 표준

모든 API 응답은 `{ data, meta? }` 형태를 사용합니다:

```typescript
// 단건
{ data: T }

// 목록 (페이지네이션)
{ data: T[], meta: { total: number, page: number, pageSize: number } }

// 에러
{ error: string, code: string }
```

---

## 환경변수

| 변수 | 용도 | 서버/클라이언트 |
|------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 둘 다 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 키 | 둘 다 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 (RLS 우회) | **서버 전용** |
| `SUPABASE_PROJECT_ID` | 타입 생성 스크립트 전용 | 빌드 타임 |
| `LOG_LEVEL` | pino 로그 레벨 (기본: dev=debug, prod=info) | 서버 |
