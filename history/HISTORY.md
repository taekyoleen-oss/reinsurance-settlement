# 작업 히스토리 (수동·반자동 기록)

## 기록 규칙

1. **언제**: DB 시드·배포·중요 스키마 변경·릴리즈 직후에 한 줄 이상 남깁니다.
2. **형식**: 날짜(ISO) → 한 줄 요약 → (선택) 관련 파일·SQL·이슈 링크.
3. **위치**: 이 파일(`history/HISTORY.md`)만 사용합니다. 다른 경로에 분산하지 않습니다.
4. **자동 추가**: 터미널에서 `pnpm run history:log -- 여기에 요약 문자열` 을 실행하면 타임스탬프와 함께 이 파일 끝에 붙습니다.

## 복원

- Git으로 이 폴더만 마지막 커밋 상태로 되돌리려면: `pnpm run history:restore`
- 저장소에 `history/` 가 아직 커밋되지 않았다면 복원할 스냅샷이 없으므로, 먼저 커밋에 포함하세요.

---

## 2026-04-30T00:00:00.000Z

데모 데이터 SQL 추가: `output/step5_demo_kr_cedants_global_reinsurers.sql` — 국내 손보(출재/cedant) 3사, Munich Re·Swiss Re·Gen Re(수재/reinsurer), 계약 3건, 명세·거래·정산서·결제·대사 연계.

## 2026-04-30T01:40:23.873Z

출재사 필터: CedantFilterSelect, GET /api/contracts?cedant_id=, 계약관리·명세·CSV업로드·정산서생성·거래등록 연동

## 2026-04-30T02:06:36.206Z

계약 API 500 완화: rs_counterparties 임베드 제거 후 attachCedantSummaries 일괄 조회; /api/contracts 빈 쿼리 URL 수정; /bordereau 브로커 경로 미들웨어 반영

## 2026-04-30T02:22:06.327Z

명세 페이지 안내 문구 정리(?contractId= 제거); ThemeToggle resolvedTheme+마운트, ThemeProvider storageKey, globals color-scheme

## 2026-04-30T02:54:51.487Z

거래 관리 필터 확장: 출재사/계약/회사(거래상대방)/기간(dateFrom~dateTo) 추가, 거래유형 파라미터를 transactionType으로 정정

## 2026-04-30T02:58:14.865Z

조회 기준 개선: 거래/정산서/결제 화면에 회사·계약·기간 필터 및 계약·회사 컬럼 추가, 거래유형 파라미터 일치화(transactionType)

## 2026-04-30T03:19:57.246Z

정산서 목록: 출재사 필터 API 반영(cedant_id), getAccountCurrents에서 계약 cedant_id 기준 contract_id IN 필터

## 2026-04-30T04:48:32.760Z

결제 관리: DB 정합(receipt/payment), 참조번호→bank_reference, 환율·원화금액 산입, 통화 마스터 로드; 거래 등록: counterpartyId 쿼리·계약 정산통화 자동·계약 콤보 출재사 표시

## 2026-04-30T05:02:33.038Z

미청산: 회사(거래상대방)·출재사·특약 필터, /api/outstanding·queries·보고서 aging/outstanding 연동, KPI/Aging props

## 2026-04-30T05:21:53.825Z

미청산 필터: fetch 레이스·캐시 방지(cancelled+cache no-store), KPI/Aging 로딩·데이터 초기화, GET /api/outstanding force-dynamic
