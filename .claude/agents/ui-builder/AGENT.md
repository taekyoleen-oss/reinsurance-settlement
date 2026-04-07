# ui-builder Agent

## 역할
재보험 정청산 시스템의 Next.js 페이지, React 컴포넌트, TweakCN 커스터마이징을 구현한다.

## 전제조건
- `output/step1_schema.sql`, `output/step2_rls_policies.sql` 완료
- `lib/`, `types/`, `app/api/` 완료 (api-designer 결과물)

## 참조 문서
- 설계서: `reinsurance-settlement-design-v1.2.md` (§5 UI/UX, §3 페이지 목록)
- 스킬: `.claude/skills/pdf-exporter/SKILL.md`

## 컬러 토큰 (글로벌 CSS `app/globals.css`)

```css
:root {
  /* 다크 테마 (기본) */
  --background:        #0F1117;
  --surface:           #1A1F2E;
  --surface-elevated:  #232837;
  --border:            #2E3447;
  --primary:           #00C9A7;
  --primary-muted:     #00C9A720;
  --accent:            #3B82F6;
  --warning:           #F59E0B;
  --warning-urgent:    #EF4444;
  --success:           #10B981;
  --pending:           #8B5CF6;
  --text-primary:      #F1F5F9;
  --text-secondary:    #94A3B8;
  --text-muted:        #475569;
  --text-number:       #E2E8F0;
}

.light {
  --background:        #F8FAFC;
  --surface:           #FFFFFF;
  --surface-elevated:  #F1F5F9;
  --border:            #E2E8F0;
  --text-primary:      #0F172A;
  --text-secondary:    #475569;
  --text-muted:        #94A3B8;
  --text-number:       #1E293B;
}

@media print {
  :root { /* 라이트 테마 강제 적용 */ }
}
```

## 레이아웃 구조

### `app/layout.tsx` (Root Layout)
- `next-themes` ThemeProvider 적용
- IBM Plex Mono 폰트 import (숫자용)
- Sonner Toaster 포함

### `app/(broker)/layout.tsx` (브로커 전용)
- 좌측 사이드바 (240px) + 메인 콘텐츠
- 사이드바: 네비게이션 메뉴 (lg 기준)
- 상단 헤더: ThemeToggle, 사용자 정보

### `app/(external)/layout.tsx` (외부 뷰어 전용)
- 단순 헤더 + 메인
- ExternalDashboard 컴포넌트 사용

## 구현할 컴포넌트 목록

### 공통 (`components/shared/`)
- **`StatusBadge.tsx`**: 상태별 색상 배지 (§5.3 색상 시스템)
  - draft=gray, pending_approval=purple, approved=blue, issued=teal, acknowledged=green, disputed=red, cancelled=gray+strikethrough
- **`CurrencyAmountInput.tsx`**: 통화 선택 + 금액 입력 (rs_currencies 기반)
- **`ExchangeRatePicker.tsx`**: 날짜 기준 환율 자동 조회 + 수동 재지정
- **`ContractSearchSelect.tsx`**: 계약 검색·선택 콤보박스
- **`ThemeToggle.tsx`**: 라이트/다크 전환 토글 (next-themes 사용)
- **`DuplicateACWarningBanner.tsx`**: 노란 배너 — 동일 계약·기간 AC 중복 경고 (저장 허용)

### 대시보드 (`components/dashboard/`)
- **`OutstandingKPICard.tsx`**: 통화별·방향별 미청산 KPI 카드
- **`AgingAnalysisTable.tsx`**: Current/30/60/90/90+일 Aging 테이블

### 거래 (`components/transactions/`)
- **`TransactionTable.tsx`**: 거래 목록 (숫자 우측정렬, mono 폰트)
- **`TransactionForm.tsx`**: 거래 입력 폼 (환율 미등록 시 에러 표시)
- **`TreatyAllocationPreview.tsx`**: 자동 배분 미리보기 (XL은 비활성화)
- **`AuditTrailDrawer.tsx`**: 수정 이력 우측 슬라이드 패널

### 정산서 (`components/account-currents/`)
- **`AccountCurrentViewer.tsx`**: 정산서 항목 뷰어 (PDF 최적화)
- **`PeriodTypeSelector.tsx`**: 정산 주기 선택 + 기간 자동 계산
- **`ApprovalStepper.tsx`**: 승인 단계 시각화 (draft → pending → approved → issued → acknowledged)
- **`ShareTokenPanel.tsx`**: 토큰 URL 생성·복사·만료 관리

### 결제 (`components/settlements/`)
- **`SettlementMatchPanel.tsx`**: 드래그앤드롭 매칭 + 금액 입력 모달
  - 드롭 시 모달 표시: 매칭 금액 입력 (기본값: min(settlement잔액, tx잔액))
  - 확인 → POST /api/settlements/match

### 대사 (`components/reconciliation/`)
- **`ReconciliationGrid.tsx`**: 브로커 ↔ 상대방 금액 비교 그리드
  - 상태: matched(green)/unmatched(red)/disputed(orange)

### 외부 (`components/external/`)
- **`ExternalDashboard.tsx`**: 단일 컴포넌트, role prop으로 분기
  - cedant_viewer: "출재사 정산 현황" 라벨
  - reinsurer_viewer: "수재사 정산 현황" 라벨
  - 공통: 발행된 AC 목록, 미청산 현황

## 구현할 페이지 목록

### 브로커 페이지 (`app/(broker)/`)
1. **`dashboard/page.tsx`**: 미청산 KPI 카드 + Aging 테이블
2. **`contracts/page.tsx`**: 계약 목록 + 상태 필터
3. **`contracts/new/page.tsx`**: 계약 등록 (Treaty: 지분율 설정 / Fac: 수재사 지정)
4. **`contracts/[id]/page.tsx`**: 계약 상세 + 지분율 내역
5. **`transactions/page.tsx`**: 거래 목록 (필터·검색)
6. **`transactions/new/page.tsx`**: 거래 입력 (배분 미리보기 포함)
7. **`transactions/[id]/page.tsx`**: 거래 상세 + Audit Trail
8. **`account-currents/page.tsx`**: 정산서 목록 (주기별 필터)
9. **`account-currents/new/page.tsx`**: 정산서 생성 (DuplicateACWarningBanner 포함)
10. **`account-currents/[id]/page.tsx`**: 정산서 상세·승인·발행·토큰
11. **`settlements/page.tsx`**: 결제 등록 + SettlementMatchPanel
12. **`reconciliation/page.tsx`**: 대사 그리드
13. **`outstanding/page.tsx`**: 미청산 상세 (상대방·계약·통화·Aging)
14. **`exchange-rates/page.tsx`**: 환율 이력 관리
15. **`counterparties/page.tsx`**: 거래상대방 CRUD
16. **`reports/page.tsx`**: 보고서 4종 (정산서 PDF, 미청산 리포트, 거래내역 Excel, Aging 리포트)

### 외부 페이지 (`app/(external)/`)
1. **`dashboard/page.tsx`**: ExternalDashboard (role-aware)
2. **`account-currents/[id]/page.tsx`**: AC 조회 + Acknowledge 버튼 + PDF 다운로드

### 공유 페이지
- **`app/share/[token]/page.tsx`**: 토큰 URL — 로그인 없이 AC 조회·다운로드
  - 서버 컴포넌트에서 adminClient로 토큰 검증
  - 유효 → AC 렌더링 / 만료 → 만료 안내 페이지

### 인증 + 관리자
- **`app/(auth)/login/page.tsx`**: Supabase Auth 로그인 폼
- **`app/admin/page.tsx`**: 사용자 관리, 토큰 URL 목록, 통화 마스터

## TweakCN 커스터마이징 규칙

| 컴포넌트 | 변경 방향 |
|---------|---------|
| Button | 라운딩 4px, Teal 주색(#00C9A7), weight 600 |
| Card | 배경 var(--surface), 얇은 border, 좌측 상태 accent bar |
| Table | 고밀도 패딩, 숫자 IBM Plex Mono, 행 hover var(--surface-elevated) |
| Badge | §5.3 상태 색상 시스템 완전 반영 |
| Input | 다크 배경, 통화 prefix 슬롯, 포커스 --primary 테두리 |
| Dialog | 블러 backdrop, 금액 확인 배너 강조 |

## 반응형 규칙
- `sm` (640px): 테이블 → 카드뷰
- `md` (768px): 사이드바 아이콘 축소
- `lg` (1024px): 기본 레이아웃 (사이드바 240px + 메인)
- `xl` (1280px): KPI 4컬럼 그리드
- `2xl` (1536px): 사이드 디테일 패널 동시 표시

## 완료 기준
- [ ] 모든 페이지 렌더링 정상
- [ ] 다크/라이트 테마 전환 정상
- [ ] 브로커/외부뷰어 역할 분기 정상
- [ ] PDF 출력 시 라이트 테마 자동 전환
- [ ] 숫자는 IBM Plex Mono + 우측 정렬
