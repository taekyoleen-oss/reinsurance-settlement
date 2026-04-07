# api-designer Agent

## 역할
재보험 정청산 시스템의 Next.js Route Handler, 비즈니스 로직 유틸, Supabase 쿼리 함수, TypeScript 타입을 구현한다.

## 전제조건
- `output/step1_schema.sql` 완료 (DB 스키마 확정)
- `output/step2_rls_policies.sql` 완료 (RLS 정책 확정)

## 참조 문서
- 설계서: `reinsurance-settlement-design-v1.2.md` (§6 구현 스펙)
- 스킬: `.claude/skills/treaty-auto-allocation/SKILL.md`
- 스킬: `.claude/skills/account-current-generator/SKILL.md`
- 스킬: `.claude/skills/outstanding-calculator/SKILL.md`
- 스킬: `.claude/skills/share-token-manager/SKILL.md`

## 구현 목록

### 1. Supabase 클라이언트 (`lib/supabase/`)

**`lib/supabase/client.ts`**:
```typescript
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`**:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Server Component / Route Handler용
```

**`lib/supabase/admin.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js'
// SERVICE_ROLE_KEY 사용 — 서버사이드 전용
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### 2. TypeScript 타입 (`types/`)

**`types/database.ts`**: Supabase 자동생성 타입 (수동 작성)
- 모든 `rs_` 테이블의 Row, Insert, Update 타입
- 역할 타입: `type UserRole = 'broker_technician' | 'broker_manager' | 'cedant_viewer' | 'reinsurer_viewer' | 'admin'`
- 상태 타입: `type ACStatus = 'draft' | 'pending_approval' | 'approved' | 'issued' | 'acknowledged' | 'disputed' | 'cancelled'`

**`types/index.ts`**: Re-export + 도메인 타입

### 3. 비즈니스 로직 유틸 (`lib/utils/`)

**`lib/utils/period.ts`** — 정산 주기 기간 계산:
```typescript
type PeriodType = 'quarterly' | 'semiannual' | 'annual' | 'adhoc'
export function getDefaultPeriod(type: PeriodType, referenceDate: Date): {from: Date, to: Date}
export function formatPeriodLabel(type: PeriodType, from: Date, to: Date): string
```

**`lib/utils/treaty-allocation.ts`** — Treaty 배분:
```typescript
// transaction_date 기준 유효 지분율 룩업 (Endorsement 지원)
export async function getEffectiveShares(
  contractId: string, transactionDate: Date
): Promise<ShareEntry[]>

// 자동 배분 계산 (소수점 오차 → 1순위 수재사 흡수)
export function allocateTreatyTransaction(
  totalAmount: number,
  shares: ShareEntry[]
): AllocatedAmount[]
```

**`lib/utils/account-current.ts`** — AC 집계 + B/F 계산:
```typescript
// 순 미청산 잔액 이월: B/F = 직전 AC net_balance - 매칭된 settlement 합계
export async function calculateBF(
  contractId: string, counterpartyId: string, currentPeriodFrom: Date
): Promise<number>

// AC 집계: transaction_type별 합산, direction 자동결정
export async function aggregateAccountCurrent(params: ACAggregateParams): Promise<ACAggregate>

// AC issued 시 스냅샷 저장
export async function snapshotACItems(acId: string): Promise<void>
```

**`lib/utils/outstanding.ts`** — 미청산 잔액:
```typescript
// is_allocation_parent=false 레코드만 포함
export async function calculateOutstanding(
  counterpartyId: string, currencyCode?: string
): Promise<OutstandingResult[]>

// Aging 분류 (Current/30/60/90/90+일)
export function classifyAging(dueDate: Date): AgingBucket
```

**`lib/utils/exchange-rate.ts`** — 환율 검증:
```typescript
// 환율 미등록 시 throw (거래 저장 블로킹)
export async function validateExchangeRate(
  currencyCode: string, transactionDate: Date
): Promise<number> // 환율값 반환
```

**`lib/utils/currency.ts`** — 통화 변환:
```typescript
export function convertAmount(amount: number, rate: number): number
export function formatAmount(amount: number, currencyCode: string): string
```

### 4. Supabase 쿼리 함수 (`lib/supabase/queries/`)

각 파일에 CRUD + 특수 쿼리 함수 구현:
- `transactions.ts`: getTransactions, createTransaction, updateTransaction, softDelete
- `account-currents.ts`: getACs, createAC, updateACStatus, getACItems
- `outstanding.ts`: getOutstandingByCounterparty, getAgingAnalysis
- `settlements.ts`: getSettlements, createSettlement, matchSettlement
- `exchange-rates.ts`: getRateByDate, createRate
- `share-tokens.ts`: createToken, validateToken, revokeToken, logAccess
- `reconciliation.ts`: getReconciliationItems, upsertReconciliationItem

### 5. Route Handlers (`app/api/`)

**거래 API**:
- `POST /api/transactions` — 환율 검증 → 거래 생성 → Treaty 자동 배분
- `GET /api/transactions` — 필터 검색
- `PATCH /api/transactions/[id]` — is_locked 확인 후 수정
- `DELETE /api/transactions/[id]` — Soft Delete
- `POST /api/transactions/allocate` — Treaty 자동 배분 미리보기

**정산서 API**:
- `POST /api/account-currents` — AC 생성 (B/F 자동 계산, 중복 체크)
- `GET /api/account-currents` — 목록
- `GET /api/account-currents/[id]` — 상세
- `POST /api/account-currents/[id]/approve` — 승인 (broker_manager만)
- `POST /api/account-currents/[id]/issue` — 발행 → 스냅샷 저장 → 거래 is_locked=true
- `POST /api/account-currents/[id]/acknowledge` — Acknowledge (cedant/reinsurer viewer만)
- `POST /api/account-currents/[id]/cancel` — 취소 → is_locked 해제 (트리거)
- `POST /api/account-currents/[id]/share` — 토큰 URL 생성

**결제 API**:
- `POST /api/settlements` — 결제 등록
- `POST /api/settlements/match` — 매칭 (드래그앤드롭 후 금액 입력)

**기타**:
- `GET /api/outstanding` — 미청산 잔액 조회
- `GET /api/exchange-rates` — 환율 조회
- `POST /api/exchange-rates` — 환율 등록
- `GET /api/currencies` — 통화 목록
- `GET /api/reports/[type]` — 보고서 데이터 (pdf/excel용)
- `GET /api/share/[token]` — 토큰 검증 (adminClient 사용)

### 6. 미들웨어 (`middleware.ts`)

```typescript
// 역할 기반 라우팅:
// /dashboard, /contracts, /transactions, ... → broker_* or admin만
// /external/* → cedant_viewer or reinsurer_viewer만
// /admin → admin만
// /share/* → 인증 불필요 (토큰으로만 접근)
```

## 구현 규칙
- 모든 Route Handler: `try/catch` + 적절한 HTTP 상태 코드 반환
- 에러 응답: `{ error: string, code?: string }`
- 성공 응답: `{ data: T }`
- 환율 미등록 에러: HTTP 422 + `{ error: '환율 미등록', currency: string, date: string }`
- 권한 없음: HTTP 403
- 잠긴 거래 수정 시도: HTTP 409 + `{ error: '잠긴 거래', is_locked: true }`
