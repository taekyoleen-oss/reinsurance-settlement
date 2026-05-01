# 재보험 정청산 관리 시스템

재보험 브로커가 수재사(Reinsurer)와의 거래를 관리하고, 정산서(Account Current)를 발행·공유하며, 결제 매칭까지 처리하는 싱글 테넌트 웹 애플리케이션입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| UI | shadcn/ui (TweakCN 커스텀) + Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일/비밀번호) |
| 상태 캐싱 | SWR |
| 로깅 | pino |
| 테스트 | Vitest |
| CI | GitHub Actions |

## 빠른 시작

### 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`에 다음 값을 채웁니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # 서버 전용, 클라이언트 노출 금지
SUPABASE_PROJECT_ID=<project-id>               # gen:types 스크립트 전용
```

### 설치 및 실행

```bash
npm install
npm run dev       # http://localhost:3000
```

### 데이터베이스 마이그레이션

`output/` 폴더의 SQL 파일을 Supabase SQL Editor에서 순서대로 실행합니다:

```
output/step1_schema.sql          # 기본 테이블 + 시퀀스
output/step2_rls_policies.sql    # Row Level Security 정책
output/step3_seed_data.sql       # 초기 데이터 (통화, 수재사)
output/step4_bordereau_and_contract_terms.sql  # 보더로 + 계약 조건
output/step5_transaction_functions.sql         # 발행/배분 트랜잭션 함수
output/step6_outstanding_functions.sql         # Outstanding/Aging RPC 함수
```

## 스크립트

```bash
npm run dev            # 개발 서버
npm run build          # 프로덕션 빌드
npm run typecheck      # TypeScript 타입 검사
npm run lint           # ESLint
npm run format         # Prettier 포맷 (파일 수정)
npm run format:check   # Prettier 포맷 검사 (CI 용)
npm run test           # Vitest 단위 테스트
npm run test:watch     # 감시 모드 테스트
npm run gen:types      # Supabase 타입 자동 생성
```

## 프로젝트 구조

```
app/
  (auth)/login/         로그인 페이지
  (broker)/             브로커 내부 전용 (RLS 보호)
    dashboard/          KPI 대시보드
    transactions/       거래 관리
    account-currents/   정산서 관리
    settlements/        결제 관리
    outstanding/        미결제 잔액 / 에이징
    contracts/          계약 관리
    counterparties/     거래상대방 관리
    bordereau/          보더로 업로드
    exchange-rates/     환율 관리
  (external)/           외부 뷰어 (수재사/원수사)
  share/[token]/        토큰 공유 페이지 (인증 불필요)
  admin/                시스템 관리자
  api/                  Route Handlers

components/
  ui/                   shadcn/ui 기반 공용 컴포넌트
  account-currents/     정산서 관련
  settlements/          결제 관련
  transactions/         거래 관련
  dashboard/            KPI, Aging 차트
  shared/               StatusBadge 등 범용

lib/
  supabase/
    client.ts           클라이언트 Supabase 인스턴스
    server.ts           서버 Supabase 인스턴스 (SSR)
    admin.ts            서비스 롤 클라이언트 (서버 전용)
    queries/            테이블별 쿼리 함수
  api/
    error-handler.ts    에러 분류 + sanitize
    auth.ts             역할 가드 헬퍼
    schemas/            zod 검증 스키마
  utils/                비즈니스 로직 (outstanding, AC 집계 등)
  logger.ts             pino 구조화 로깅

types/                  TypeScript 타입 정의
output/                 SQL 마이그레이션 파일
tests/                  Vitest 단위 테스트
```

## 주요 비즈니스 규칙

| 규칙 | 내용 |
|------|------|
| 정산서 단위 | 수재사(counterparty)별 별도 AC |
| B/F 이월 | 직전 AC net_balance − 매칭된 settlement 합계 |
| Direction | net_balance > 0 → to_reinsurer, < 0 → to_cedant |
| 환율 미등록 | 거래 저장 블로킹 (422 응답) |
| AC 취소 | 연결 거래 is_locked 자동 해제 (DB 트리거) |
| 토큰 공유 | 발행·수신확인 상태 AC만 공유 링크 생성 가능 |

## 역할 체계

| 역할 | 접근 가능 영역 |
|------|--------------|
| `broker_admin` | 전체 |
| `broker_staff` | 브로커 내부 페이지 (삭제 제외) |
| `cedant_viewer` | `/external` 전용 |
| `reinsurer_viewer` | `/external` 전용 |

## 환경 요구사항

- Node.js 22+
- npm 10+
