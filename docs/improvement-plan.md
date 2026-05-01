# 재보험 정청산 시스템 개선 계획

> **작성일**: 2026-05-01
> **대상 버전**: v1.4 입력 강화 & 프로세스 가시화 완료 시점

---

## 배경

3단계(DB → API → UI) 구현이 완료되고 v1.4 입력 강화 단계까지 마무리된 현재, 코드베이스는 **기능적으로는 동작**하지만 다음과 같은 구조적 부채가 누적된 상태다.

- 페이지네이션·캐싱·서버 컴포넌트가 사실상 미적용 → 거래·정산서 데이터 누적 시 성능 급락
- 입력 검증·트랜잭션·에러 핸들링 표준이 없어 운영 환경 데이터 정합성 위험
- `as any` 54건, 테스트·README·prettier·husky 0건 → 회귀 검증·신규 합류자 온보딩 어려움

운영 데이터 누적과 외부 뷰어/공유 토큰 트래픽 증가 전에 **데이터 정합성과 성능 기반**을 먼저 정비하는 것이 목표다.

---

## 발견사항 요약

| 영역 | Critical | High | Medium | Low |
|------|---------:|-----:|-------:|----:|
| 성능 | 0 | 6 | 4 | 2 |
| 안정성/보안 | 2 | 4 | 4 | 3 |
| 코드 품질 | 0 | 3 | 4 | 3 |

**핵심 근거**
- 28개 API 라우트 중 **페이지네이션 0건**, `select('*')` 23건, `dynamic import` 0건, `'use client'` 51건
- **트랜잭션·zod 검증 0건**, 권한 역할 체크는 28개 중 6개에만, 테스트 인프라 0건
- `as any` **54건**, README·prettier·husky·error.tsx **모두 부재**, `xlsx@0.18.5` ReDoS 취약 버전

---

## 🔴 Critical — 즉시 조치

### C1. 발행/배분 트랜잭션 원자화

**문제**
`app/api/account-currents/[id]/issue/route.ts:54-70` 의 ① snapshot ② transactions lock UPDATE ③ AC status 업데이트가 **3개의 독립 호출**. 중간 실패 시 거래만 lock되고 AC는 draft로 남는 부분 실패 가능.
`app/api/transactions/route.ts:38-60` 의 부모 거래 + treaty allocation도 동일.

**조치**
Postgres 함수(`rs_issue_account_current(p_ac_id uuid)`, `rs_create_parent_with_allocations(...)`)로 옮겨 단일 트랜잭션 보장. Race condition 방지를 위해 `SELECT ... FOR UPDATE` 또는 advisory lock 사용.

**검증**
발행 도중 강제 종료 시 거래 lock 상태가 원복되는지 통합 테스트.

---

### C2. API 입력 검증 도입 (zod)

**문제**
28개 라우트 전부 `await req.json()` 결과를 검증 없이 spread하여 DB insert.
`app/api/contracts/route.ts:56-60`: `insert({ ...body, created_by: user.id })` — body 전체 spread, 임의 컬럼 주입 가능(`status: 'approved'`, `is_locked: false` 등).

**조치**
1. `zod` 의존성 추가
2. `lib/api/schemas/{contract,transaction,ac,settlement,bordereau}.ts` 작성 (DB 컬럼 화이트리스트)
3. `lib/api/handler.ts`에 `withSchema(schema, handler)` HOF 도입
4. 28개 라우트를 헬퍼로 마이그레이션

**검증**
화이트리스트 외 필드 주입 시 400 응답 확인.

---

## 🟠 High — 1~2주 내

### H1. 공통 에러 핸들러 + 메시지 sanitize

**문제**
28개 라우트 47건 `catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }`.
PostgreSQL 제약명·RLS 정책명이 그대로 외부 노출.

**조치**
`lib/api/error-handler.ts` 단일 진입점, 에러 분류(ValidationError/AuthError/NotFound/Conflict/Unknown), production에서는 일반 메시지 + 서버 로그에만 상세 기록.

---

### H2. 모든 mutating 라우트에 역할 가드 적용

**문제**
`requireRole(['broker_*','admin'])` 가드가 6개 파일에만 존재. `contracts`/`transactions`/`bordereau/upload` POST에 broker 역할 검증 없음 → 인증된 cedant_viewer가 데이터 생성 가능.

**조치**
`lib/api/auth.ts`에 `requireUser`, `requireRole`, `requireBrokerRole` 헬퍼 작성 → 28개 라우트에 일괄 적용.

---

### H3. 페이지네이션 도입

**문제**
`lib/supabase/queries/{transactions,account-currents,settlements}.ts`, `app/api/contracts/route.ts:17` 등 모든 목록 API가 무한 풀 페치. `.range()/.limit()` 0건.

**조치**
표준 `?page=1&pageSize=50` 쿼리 파라미터 + `{ data, total, page, pageSize }` 응답 형태 통일.

---

### H4. Outstanding/Aging 집계를 Postgres RPC로 이전

**문제**
`lib/utils/outstanding.ts:130-273` 의 `calculateOutstanding`/`getAgingAnalysis`가 모든 거래를 메모리로 가져와 JS Map으로 집계. `adminClient` 사용으로 RLS 우회까지.

**조치**
`rs_calc_outstanding(p_currency, p_as_of)`, `rs_calc_aging(...)` PG 함수로 이전. `SECURITY DEFINER` 적용 시 정책 보강.

---

### H5. 클라이언트 번들 다이어트 (동적 import)

**문제**
`recharts`, `jspdf`, `jspdf-autotable`, `xlsx`, `pptxgenjs` — `next/dynamic` 사용 0건. 정적 import 가능성.

**조치**
PDF/Excel/차트는 `next/dynamic(() => import(...), { ssr: false })`로 lazy. `pptxgenjs`는 사용 여부 점검 후 미사용이면 제거.

---

### H6. 테스트 인프라 부트스트랩

**문제**
`jest.config.*`, `vitest.config.*`, `playwright.config.*`, `tests/` 모두 없음.

**조치**
1. **Vitest** — `lib/utils/{outstanding,account-current,bordereau-validators}` 단위 테스트 (B/F 이월, 매칭 status, 행 검증)
2. **Playwright** — Critical path E2E: ① 거래 생성→AC 발행→공유 토큰 조회 ② Settlement 매칭→Disputed 해결
3. GitHub Actions 최소 lint+typecheck+test 워크플로우

---

### H7. `xlsx@0.18.5` ReDoS 보안 패치

**문제**
GHSA-4r6h-8v6p-xvw6 영향 버전.

**조치**
`xlsx@^0.20` 업그레이드 또는 `exceljs`로 교체.

---

## 🟡 Medium — 3~4주

### M1. `as any` 제거 + Supabase 타입 자동 생성

54건의 `as any`(주로 `lib/supabase/queries/*`, API 라우트)는 수동 작성된 `types/database.ts`(968줄)와 실제 스키마 불일치에서 비롯.

- `supabase gen types typescript --project-id ... > types/database.ts` 자동화
- 미적용 마이그레이션 `output/step4_bordereau_and_contract_terms.sql`을 `supabase/migrations/`로 이전 + 적용 후 타입 재생성

---

### M2. 서버 컴포넌트 + Server Action 전환

`app/(broker)/{outstanding,transactions,account-currents}/page.tsx` 가 `'use client'`로 시작하면서 `useEffect+fetch`로 데이터 로드 → 초기 렌더 깜빡임.
페이지 자체는 RSC, 인터랙티브 부분만 client island로 분리.

---

### M3. SWR 도입 (데이터 페칭 중복 제거)

`transactions/page.tsx:46-56`, `account-currents/page.tsx:32-42`, `outstanding/page.tsx:64-74`가 동일한 contracts/counterparties 호출을 중복 작성.
SWR 도입 + `useContracts`, `useCounterparties` 커스텀 훅으로 캐시 공유.

---

### M4. 거대 컴포넌트 분할

| 파일 | 줄수 | 분할 방향 |
|------|-----:|---------|
| `app/(broker)/contracts/new/page.tsx` | 490 | 폼 섹션별 서브 컴포넌트 |
| `components/transactions/TransactionForm.tsx` | 377 | 폼 로직 훅 분리 |
| `app/(broker)/settlements/page.tsx` | 366 | 폼/테이블/매칭패널 분리 |
| `app/admin/page.tsx` | 292 | 섹션별 분리 |

---

### M5. 가상화 (대용량 테이블)

`TransactionTable`, Outstanding 상세, BordereauTable에 `@tanstack/react-virtual` 또는 `react-window` 적용 (500행 초과 시 DOM 폭증 방지).

---

### M6. 네이밍 일관화

- `ac_no` vs `ac_number` 분기 코드 정리 (`account-currents/[id]/page.tsx:70`)
- `company_name` vs `company_name_ko/en` 혼재 정리 (23개 파일)
- DB 컬럼이 정답이므로 타입 자동 생성 후 일괄 치환

---

### M7. App Router 표준 바운더리

`app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `(broker)`/`(external)`/`share` 세그먼트별 `error.tsx` 추가.
`share/[token]/page.tsx` self-fetch 패턴 제거 → 직접 `lib/supabase/server` 사용.

---

### M8. CSV 파싱 안전화

`app/api/bordereau/upload/route.ts:14-25`의 `line.split(',')` 대신 `papaparse` 도입.
CSV injection(`=`, `+`, `-`, `@`로 시작하는 셀) sanitize.

---

## 🔵 Low — 장기

### L1. 구조화 로깅 + 감사 로그
`pino` 도입. `/api/share/[token]/route.ts:41` `.catch(() => {})` silent fail 정상화.

### L2. 개발 자동화
`prettier` + `eslint-config-prettier` + `husky` + `lint-staged`.
`package.json` 스크립트: `typecheck`, `test`, `test:e2e`, `format`, `format:check`.

### L3. 문서
- 루트 `README.md` (프로젝트 개요·실행법·환경변수·스크립트)
- `docs/architecture.md` (RLS 모델, 토큰 공유 흐름, 트랜잭션 단위)

### L4. 응답 포맷 통일
모든 API 응답을 `{ data, meta? }` 형태로 통일. 클라이언트 `Array.isArray(d) ? d : (d.data ?? [])` 가드 제거.

### L5. JWT claims 활용
매 요청마다 `rs_user_profiles`에서 role 재조회 대신 JWT custom claims에 role 저장 → 라운드트립 절감.

---

## 단계별 로드맵

### Phase 1 (Week 1~2) — 데이터 정합성과 보안 기반

**목표**: 운영 데이터 누적 전에 정합성·권한 차단 완료

| 항목 | 관련 이슈 |
|------|----------|
| 트랜잭션 원자화 (issue, treaty allocation) | C1 |
| zod 검증 + 역할 가드 + 에러 핸들러 통합 헬퍼 | C2, H1, H2 |
| `xlsx` 보안 업그레이드 | H7 |
| `error.tsx`/`not-found.tsx` 추가 | M7 |

**완료 기준**: 28개 라우트 전체가 `withSchema` + `requireRole` 적용, 발행 실패 시 자동 롤백 통합 테스트 통과

---

### Phase 2 (Week 3~4) — 성능 기반과 회귀 안전망

**목표**: 데이터 누적/사용자 증가 대비

| 항목 | 관련 이슈 |
|------|----------|
| 페이지네이션 표준 | H3 |
| Outstanding/Aging Postgres RPC 이전 | H4 |
| 동적 import (PDF/Excel/차트) | H5 |
| Vitest + Playwright + CI 워크플로우 | H6 |
| SWR 도입 | M3 |

**완료 기준**: 거래 1만 건 시드 시 목록 페이지 TTI 2초 이하, Critical E2E 시나리오 그린

---

### Phase 3 (Week 5~) — 유지보수성과 확장성

**목표**: 신규 합류자 온보딩 비용 절감

| 항목 | 관련 이슈 |
|------|----------|
| Supabase 타입 자동 생성 + `as any` 50% 이상 제거 | M1 |
| 서버 컴포넌트 전환 (페이지 단위) | M2 |
| 거대 컴포넌트 분할 | M4 |
| 가상화 (Outstanding, Bordereau) | M5 |
| 네이밍 일관화 | M6 |
| CSV papaparse 교체 | M8 |
| 로깅·prettier·husky·README·응답 포맷 | L1~L5 |

**완료 기준**: `as any` 10건 이하, README·CONTRIBUTING 존재, prettier/husky pre-commit 동작

---

## 검증 방법

### 자동 (CI 파이프라인)
```bash
npm run typecheck    # tsc --noEmit 그린
npm run lint         # eslint 경고 0
npm run test         # Vitest (B/F 이월, AC 집계, zod 스키마)
npm run test:e2e     # Playwright (거래→AC 발행→토큰 공유, Settlement 매칭)
```

### 수동 (Phase 1 직후)
1. `output/step4_*.sql` Supabase에 적용 → `supabase gen types`
2. 거래 1만 건 + AC 100건 시드 → 목록 페이지 응답 시간 측정
3. cedant_viewer 토큰으로 broker 라우트 호출 시도 → 403 확인
4. AC 발행 도중 네트워크 차단 → 거래 lock 원복 확인
5. 외부 토큰 페이지 SSR (`NEXT_PUBLIC_APP_URL` 미설정 환경) → 정상 렌더 확인

---

## Phase 1 핵심 변경 파일

**신규 생성**
```
lib/api/handler.ts               # withSchema, withErrorHandler HOF
lib/api/auth.ts                  # requireUser, requireRole, requireBrokerRole
lib/api/error-handler.ts         # 에러 분류·sanitize
lib/api/schemas/
  ├── contract.ts
  ├── transaction.ts
  ├── account-current.ts
  ├── settlement.ts
  └── bordereau.ts
output/step5_transaction_functions.sql  # rs_issue_account_current, rs_create_parent_with_allocations
app/error.tsx
app/not-found.tsx
app/(broker)/error.tsx
app/(external)/error.tsx
```

**수정**
```
app/api/account-currents/[id]/issue/route.ts   # RPC 호출 한 줄로
app/api/transactions/route.ts                  # RPC 호출
app/api/**/*.ts (28개)                          # withSchema + requireRole 적용
package.json                                   # zod 추가, xlsx 업그레이드, test/typecheck 스크립트
```
