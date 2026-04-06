# 재보험 정청산 관리 시스템 — Claude Code 오케스트레이터

## 프로젝트 개요
- **설계서**: `reinsurance-settlement-design-v1.2.md` (현재 v1.3 내용 포함)
- **기술 스택**: Next.js 15 (App Router) · TweakCN(shadcn/ui 기반) · Supabase
- **DB 접두어**: 모든 테이블은 `rs_` 접두어 사용
- **싱글 테넌트**: 단일 브로커 회사 전용 (broker_id 불필요)
- **Edge Function 미사용**: 모든 서버로직은 Next.js Route Handler

## 코딩 규칙
- TypeScript strict mode, async/await (callback 금지)
- 환경변수는 `.env.local` 사용
- `SUPABASE_SERVICE_ROLE_KEY`는 서버사이드 전용 (클라이언트 노출 금지)
- 모든 테이블명 `rs_` 접두어 필수
- 금액 숫자: `IBM Plex Mono` 폰트, 우측 정렬
- 다크 테마 기본값, `next-themes`로 라이트/다크 토글 지원

## 구현 단계 (순서 엄수)

### [1단계] db-architect
- **실행**: `.claude/agents/db-architect/AGENT.md` 참조
- **출력**: `output/step1_schema.sql`, `output/step2_rls_policies.sql`, `output/step3_seed_data.sql`
- **완료 기준**: 마이그레이션 오류 0, FK 정합성 통과

### [2단계] api-designer
- **실행**: `.claude/agents/api-designer/AGENT.md` 참조
- **전제**: 1단계 완료 후 실행
- **출력**: `app/api/`, `lib/supabase/`, `lib/utils/`, `types/`
- **완료 기준**: TypeScript 컴파일 오류 0

### [3단계] ui-builder
- **실행**: `.claude/agents/ui-builder/AGENT.md` 참조
- **전제**: 1, 2단계 완료 후 실행
- **출력**: `app/(broker)/`, `app/(external)/`, `app/share/`, `components/`
- **완료 기준**: 주요 페이지 렌더링 정상

## 핵심 비즈니스 규칙 요약

| 규칙 | 내용 |
|------|------|
| Non-Proportional | v1 수동 입력만, allocation_type='manual' 강제 |
| B/F 이월 | 직전 AC net_balance - 매칭된 settlement 합계 |
| AC 발행 단위 | 수재사별 별도 AC, counterparty_id = 수재사 |
| Direction 자동결정 | net_balance>0 → to_reinsurer, <0 → to_cedant |
| Parent TX | is_allocation_parent=true → Outstanding 계산 제외 |
| AC cancelled | 연결 거래 is_locked 자동 false (DB 트리거) |
| 환율 미등록 | 거래 저장 블로킹, 등록 후 재시도 |
| 일련번호 | PostgreSQL Sequence + DB 트리거 자동 채번 |
| Acknowledge | 외부 뷰어(cedant/reinsurer viewer)가 버튼 클릭으로 상태 전환 |
| Disputed 해결 | AC cancelled + 새 draft 생성(재발행) |

## 스킬 참조 가이드
- DB 스키마/RLS → `.claude/skills/supabase-rls/SKILL.md`
- Treaty 자동 배분 → `.claude/skills/treaty-auto-allocation/SKILL.md`
- AC 집계/B/F → `.claude/skills/account-current-generator/SKILL.md`
- Outstanding/Aging → `.claude/skills/outstanding-calculator/SKILL.md`
- 토큰 URL → `.claude/skills/share-token-manager/SKILL.md`
- PDF 출력 → `.claude/skills/pdf-exporter/SKILL.md`

## 파일 구조 규칙
```
app/
  (auth)/login/               → 로그인 페이지
  (broker)/                   → 브로커 내부 직원 전용 (RLS 보호)
  (external)/                 → 외부 뷰어 전용 (role-aware ExternalDashboard)
  share/[token]/              → 토큰 URL 공유 페이지 (인증 불필요)
  admin/                      → 시스템 관리자 전용
  api/                        → Route Handlers (Edge Function 없음)
components/
  ui/                         → shadcn/ui 기반 TweakCN 커스텀 컴포넌트
  dashboard/                  → KPI, Aging 컴포넌트
  transactions/               → 거래 관련
  account-currents/           → 정산서 관련
  settlements/                → 결제 관련
  reconciliation/             → 대사 관련
  shared/                     → 공용 컴포넌트
lib/
  supabase/client.ts          → 클라이언트용 Supabase 인스턴스
  supabase/server.ts          → 서버용 Supabase 인스턴스 (SSR)
  supabase/queries/           → 테이블별 쿼리 함수
  utils/                      → 비즈니스 로직 유틸
types/                        → TypeScript 타입 정의
output/                       → SQL 마이그레이션 파일
```
