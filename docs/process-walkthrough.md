# 재보험 정청산 전체 프로세스 가이드 (예시 포함)

> **시나리오**: 한국화재보험(출재사, Cedant)이 화재보험 1년치를
> Munich Re Korea(수재사, Reinsurer) 60% + Swiss Re Korea(수재사) 40% 에
> 비례재보험으로 출재. 우리 시스템 운영자가 **중개사(Broker)** 로
> Cedant 와 Reinsurer 사이에서 자금·문서·정산을 통과시키며 수수료를 수취.
>
> **계약 핵심 수치**
>
> - 계약번호: TRT-2026-001
> - 기간: 2026-01-01 ~ 2026-12-31 (1년)
> - 통화: USD
> - 정산주기: 분기 (quarterly)
> - 예상 분기 보험료: 250,000 USD × 4분기 = 1,000,000 USD/년
> - Ceding commission: 25% (브로커→수재사 송금 시 차감)
> - Brokerage: 2% (브로커 자체 수수료, 25% 안에 포함됨)
> - 납기: 분기 종료일 + 15일

---

## 자금 흐름 한눈에

```
┌──────────┐ premium 입금 ┌──────────┐ premium 송금(75%) ┌──────────────┐
│ Cedant   │ ───────────▶ │ Broker   │ ──────────────▶ │ Reinsurer A  │
│ 한국화재  │   250K USD   │ 우리회사  │   112.5K (60%)  │ Munich Re    │
└──────────┘              │          │   75.0K  (40%)  │ Swiss Re     │
                          │ commission│                  └──────────────┘
                          │  62.5K   │
                          │  (25%)   │
                          └──────────┘

손해 발생 시 (Loss flow, 반대 방향):

┌──────────┐ loss 입금 ┌──────────┐ loss 송금 ┌──────────┐
│Reinsurer │ ────────▶ │ Broker   │ ────────▶ │ Cedant   │
└──────────┘            └──────────┘            └──────────┘
```

---

## Step 1 — 계약 등록 (Contract Setup)

### 1-1. 계약 마스터 입력

**화면**: `사이드바 → 계약 관리 → 계약 등록`

**입력 필드** (예시값):
| 필드 | 값 |
|---|---|
| 계약번호 | TRT-2026-001 |
| 계약유형 / treaty 유형 | treaty / proportional |
| 보험업종 | 화재 (fire) |
| 출재사 | 한국화재보험(주) |
| 개시일 / 만기일 | 2026-01-01 / 2026-12-31 |
| 정산통화 | USD |
| 정산주기 | quarterly |
| Ceding commission | 25.0% |
| Brokerage | 2.0% |
| 납기일수 | 15일 |

**DB**: `INSERT INTO rs_contracts ...`

### 1-2. 수재사 지분 등록 (proportional 인 경우 합계 100%)

**화면**: 계약 상세 → "지분율 추가"

| 수재사          | 지분 |
| --------------- | ---- |
| Munich Re Korea | 60%  |
| Swiss Re Korea  | 40%  |

**DB**: `INSERT INTO rs_contract_shares (contract_id, reinsurer_id, signed_line, ...)`

### 1-3. 보험료 정산 일정 자동 생성

**화면**: 계약 상세 → 보험료 정산 일정 카드 → **"기간 자동생성"** 버튼

분기별 4개 행이 자동 생성됨 (납기는 종료일 +15일):

| 기간   | period_from | period_to  | 납기       | 예상 보험료 (입력 후) |
| ------ | ----------- | ---------- | ---------- | --------------------- |
| 2026Q1 | 2026-01-01  | 2026-03-31 | 2026-04-15 | **250,000 USD**       |
| 2026Q2 | 2026-04-01  | 2026-06-30 | 2026-07-15 | 250,000 USD           |
| 2026Q3 | 2026-07-01  | 2026-09-30 | 2026-10-15 | 250,000 USD           |
| 2026Q4 | 2026-10-01  | 2026-12-31 | 2027-01-15 | 250,000 USD           |

각 행의 "예상 보험료" 셀에 250000 입력 → **저장 버튼 (💾)** 클릭.

**DB**: `INSERT INTO rs_contract_settlement_schedules (contract_id, schedule_type='premium', period_label, period_from, period_to, expected_amount, due_date, ...)`

---

## Step 2 — 명세서(Bordereau) 수신 + 입력

### 2-1. 출재사가 분기 종료 후 보험료 명세서 송부

예: 한국화재보험이 2026-04-05 에 1Q 명세서(엑셀/PDF) 전달.

명세 라인 예시:
| 증권번호 | 피보험자 | 위험기간 | 보험가입금액 | 원보험료 | 출재율 | 출재보험료 |
|---|---|---|---|---|---|---|
| POL-001 | A전자 | 2026-01-01~03-31 | 5,000,000 | 100,000 | 100% | 100,000 |
| POL-002 | B물류 | 2026-01-15~04-14 | 7,500,000 | 150,000 | 100% | 150,000 |
| | | | | | **합계** | **250,000** |

### 2-2. 시스템 입력

**화면**: `사이드바 → 명세 입력` 또는 계약 상세 → "명세 입력"

옵션 A: **수동 입력** — `보험료 명세 추가` 버튼 → 라인별 직접 입력
옵션 B: **CSV 업로드** — `/bordereau/upload`

**DB**: `INSERT INTO rs_premium_bordereau (contract_id, period_yyyyqn='2026Q1', policy_no, ceded_premium, ...)`

### 2-3. 1차 검증 — 3-Way 일치 확인

**화면**: 계약 상세 상단 **"업무 흐름 진행 상황"** 카드 → 3-Way 일치 검증 위젯

| ① 계약 예상 (스케줄 합계) | ② 명세서 합계 (ceded)  | ③ 실제 수령 (입금) |
| ------------------------- | ---------------------- | ------------------ |
| 250,000 USD               | 250,000 USD            | 0 USD (아직)       |
|                           | ②/① = **100% 일치** ✅ | ③/① = 0% (수령 전) |

→ 명세서가 계약 예상과 일치함을 확인. 만약 불일치(예: 명세 합계가 230,000) 면 출재사에 확인 요청.

---

## Step 3 — 은행 입금 확인 + 수령 등록

### 3-1. 한국화재보험이 2026-04-12 SWIFT 송금 완료 (납기일 4/15 보다 3일 이른 시점)

브로커 USD 계좌에 250,000 USD 입금 확인.

### 3-2. 수령 확인 입력

**화면**: 계약 상세 → 보험료 정산 일정 카드 → 2026Q1 행 우측 **"확인" 버튼**

→ 모달 (`ReceiptConfirmDialog`) 열림:

| 필드           | 값                     |
| -------------- | ---------------------- |
| 수령/송금 구분 | inbound (입금)         |
| 거래상대방     | 한국화재보험           |
| 수령 날짜      | 2026-04-12             |
| 금액           | 250,000 USD            |
| KRW 환율       | 1,378.50               |
| 은행 참조번호  | SWIFT-2026-HF-Q1       |
| 비고           | 1분기 보험료 전액 수령 |

→ "수령 확인 저장"

**DB**: `INSERT INTO rs_premium_receipts (schedule_id, direction='inbound', received_amount=250000, bank_reference, match_status='matched', ...)`

### 3-3. 결과 — 3-Way 모두 일치

| ① 계약 예상 | ② 명세 합계 | ③ 실제 수령         |
| ----------- | ----------- | ------------------- |
| 250,000     | 250,000     | **250,000** ✅      |
|             | ②/① 100%    | ③/① 100% / ③/② 100% |

→ 워크플로우 카드 5단계 "수령 확인" 이 ✅ done 으로 전환.

---

## Step 4 — 정산서(AC) 발행 → 수재사 청구

### 4-1. 1Q 가 마감되었으니 수재사별로 정산서 발행

**Munich Re (60%)** 와 **Swiss Re (40%)** 각각 별도 AC 작성 (싱글 테넌트 규칙: AC 는 수재사 단위).

### 4-2. AC 작성 (Munich Re 측)

**화면**: 계약 상세 → 2026Q1 행 우측 **"발행" 버튼** (자동 prefill)
또는: `사이드바 → 정산서 관리 → 정산서 생성`

**입력**:
| 필드 | 값 |
|---|---|
| 계약 | TRT-2026-001 |
| 거래상대방 | Munich Re Korea |
| 정산기간 | 2026-01-01 ~ 2026-03-31 |
| 통화 | USD |

→ **"정산서 생성"** 클릭

**DB 자동 처리**:

1. `INSERT INTO rs_account_currents (contract_id, counterparty_id, period_from, period_to, status='draft', ...)`
2. `aggregateAccountCurrent()` 가 transaction/명세 집계로 다음 계산:
   - subtotal_premium = 250,000 × 60% = **150,000** (Munich Re 의 60% 지분)
   - subtotal_commission = -150,000 × 25% = **-37,500** (수재사가 제공하는 ceding commission)
   - net_balance = **112,500** (브로커가 Munich Re 에 송금해야 할 금액)
   - direction = `to_reinsurer`
3. `linkPremiumReceiptsToAC()` 가 자동 호출되어 같은 계약·상대·기간 범위의 receipt 를
   `linked_ac_id` 로 연결 (이 경우 한국화재 inbound 가 보임)

### 4-3. AC 본문 (Account Current Statement)

```
Account Current — TRT-2026-001 / Munich Re Korea
Period: 2026-01-01 ~ 2026-03-31

Premium                                  150,000.00
Ceding Commission (25%)                  -37,500.00
Loss                                          0.00
─────────────────────────────────────────────────
NET BALANCE (to Munich Re)             112,500.00
```

Swiss Re 측 AC 도 동일하게: net_balance = 250,000 × 40% × 75% = **75,000 USD**

### 4-4. AC 워크플로우 단계별 진행

브로커 내부 / Munich Re 와의 합의 단계:

```
draft → approved → reviewed → issued → acknowledged
        (승인)     (검수)     (발행)    (수재사 수신확인)
```

**화면**: AC 상세 → 단계별 버튼 ("승인 요청" → "승인" → "검수" → "발행")

각 클릭마다:

- `POST /api/account-currents/[id]/approve | review | issue`
- `rs_account_currents.status` 업데이트
- ApprovalStepper 가 진행 표시

발행(issued) 후, 수재사가 외부 뷰어 화면에서 "수신 확인(Acknowledge)" 클릭 →
`status='acknowledged'`. 이제 송금 가능.

---

## Step 5 — 수재사에 보험료 송금 (Outbound)

### 5-1. Munich Re 와 합의 완료 → 2026-04-25 SWIFT 송금 112,500 USD

브로커 계좌에서 출금.

### 5-2. 송금 확인 등록 — 두 가지 방법

#### 방법 A: 보험료 정산 일정 카드의 "확인" 모달에서 outbound 등록

**화면**: 계약 상세 → 1Q 행 → "확인" 버튼

| 필드           | 값                                         |
| -------------- | ------------------------------------------ |
| 수령/송금 구분 | **outbound (송금)**                        |
| 거래상대방     | Munich Re Korea                            |
| 송금 날짜      | 2026-04-25                                 |
| 금액           | 112,500 USD                                |
| 은행 참조번호  | SWIFT-2026-MR-Q1-OUT                       |
| 비고           | 1Q Munich Re 송금 (수수료 25% 차감 후 75%) |

**DB**: `INSERT INTO rs_premium_receipts (direction='outbound', counterparty_id=Munich Re, received_amount=112500, ...)`

#### 방법 B: 결제 관리에서 정식 결제(Settlement) 등록

**화면**: `사이드바 → 결제 관리 → 결제 등록`

해당 AC 와 연결되는 `rs_settlements` 행 생성, 워크플로:

```
pending → remitted → verified
         (송금실행)   (송금검수)
```

### 5-3. 결과 — AC 상세의 LinkedReceiptsCard

```
은행 수령·송금 연결 (1건 연결 / 0건 후보)

정산서 net 잔액   입금 합계   송금 합계   정산 충족률
112,500 USD      –           112,500    100%  ✅ 완전 충족
→ 수재사 지급
```

연결된 송금 목록:
| 날짜 | 구분 | 거래상대방 | 금액 | 은행참조번호 | 매칭 |
|---|---|---|---|---|---|
| 2026-04-25 | 송금 | Munich Re Korea | USD 112,500 | SWIFT-2026-MR-Q1-OUT | 연결완료 |

Swiss Re 도 동일: AC net 75,000 → 75,000 송금 완료.

### 5-4. 브로커 자체 수익

브로커가 수령한 250,000 중 송금 합계 = 112,500 + 75,000 = 187,500
→ 브로커 보유 = **62,500 USD** (이 중 일부가 brokerage 2%)

`사이드바 → 수수료` 대시보드에서 통화별·계약별 ceding commission / brokerage 추정치 확인 가능.

---

## Step 6 — 보험금(Loss) 흐름

### 시나리오: 2026-05-20 A전자(피보험자) 화재 사고 — 손해 1,000,000 USD

### 6-1. 출재사가 손해 명세 송부

**화면**: 명세 입력 → "손해 명세 추가" 또는 CSV 업로드

| 사고번호    | 사고일     | 지급보험금 | 미결손해 | 출재율 | 재보험금 회수 | Cash Loss           |
| ----------- | ---------- | ---------- | -------- | ------ | ------------- | ------------------- |
| CL-2026-001 | 2026-05-20 | 1,000,000  | 0        | 100%   | **1,000,000** | Yes (10만 USD 초과) |

**DB**: `INSERT INTO rs_loss_bordereau (contract_id, claim_no, paid_amount, recoverable_amount, is_cash_loss, ...)`

### 6-2. Cash Loss 청구서 발행 (수재사 → 브로커)

손해 회수액 1,000,000 USD 를 수재사 지분 비율로 분배:

- Munich Re 60% → 600,000 USD 회수 청구
- Swiss Re 40% → 400,000 USD 회수 청구

**화면**: 청구 관리(`/claims`) 또는 계약 상세 → 손해 정산 일정 카드 → "기간 추가"

기간 라벨: `LOSS-CL-2026-001`, 예상 회수액: 1,000,000 USD

### 6-3. 수재사로부터 입금 (회수)

Munich Re 가 2026-06-10 에 600,000 USD 송금:

**화면**: 계약 상세 → **보험금(Loss) 정산 일정 & 회수·지급 현황 카드** → 해당 행 "입력" 버튼

| 필드          | 값                         |
| ------------- | -------------------------- |
| 구분          | **회수** (수재사 → 브로커) |
| 거래상대방    | Munich Re Korea            |
| 날짜          | 2026-06-10                 |
| 금액          | 600,000 USD                |
| 은행 참조번호 | SWIFT-MR-LOSS-001          |

Swiss Re 도 동일하게 400,000 USD 회수 → 합계 1,000,000 USD 가 브로커 계좌에 모임.

**DB**: `INSERT INTO rs_loss_receipts (direction='inbound', counterparty_id=수재사, received_amount, ...)`

### 6-4. 출재사에 보험금 지급 (송금)

브로커가 한국화재보험에 1,000,000 USD 전액 송금 (2026-06-15).

**화면**: 같은 카드, 같은 행 → "입력" 버튼 → 구분 = **지급** (브로커 → 출재사)

| 필드          | 값                         |
| ------------- | -------------------------- |
| 구분          | **지급** (브로커 → 출재사) |
| 거래상대방    | 한국화재보험               |
| 날짜          | 2026-06-15                 |
| 금액          | 1,000,000 USD              |
| 은행 참조번호 | SWIFT-HF-LOSS-001          |

**DB**: `INSERT INTO rs_loss_receipts (direction='outbound', counterparty_id=Cedant, ...)`

### 6-5. AC 발행 (보험금 회수 청구서)

각 수재사 별로 **direction='to_cedant'** 인 AC 발행:

```
Account Current — TRT-2026-001 / Munich Re Korea
Period: 2026-04-01 ~ 2026-06-30

Premium                                   0
Loss (회수)                          -600,000
Commission                                0
─────────────────────────────────────────────────
NET BALANCE (recoverable)            -600,000
direction = to_cedant (수재사가 출재사로 환급)
```

→ AC stepper 진행 후 issue → acknowledge → settlement 완료

---

## Step 7 — 결제 완료 / 미수 관리

### 7-1. 정상 케이스: 모든 단계 완료

`/contracts/[id]` 워크플로우 카드:

```
1. 계약 등록 ✅
2. 수재사 지분 ✅ (60% + 40% = 100%)
3. 정산 일정   ✅ (4 / 4 분기)
4. 명세 입력   ✅ (4건)
5. 수령 확인   ✅ (4건 완납)
6. 정산서 발행 ✅ (8건: 분기당 수재사 2개)
7. 결제 송금   ✅ (8건 송금 완료)
```

### 7-2. 미수 케이스: 2026Q3 보험료 한국화재 미입금

`사이드바 → 보험료 일정` 페이지에서 KPI 자동 표시:

- 연체 1건 (TRT-2026-001 2026Q3)
- 잔액 250,000 USD

**화면**: `/contracts/[id]` → 정산 일정 카드의 2026Q3 행이 빨간 배경 / "연체" 배지

→ 출재사에 독촉 후, 부분 입금 등록 또는 전액 입금 후 확인 처리.

### 7-3. 분쟁 (Disputed) 케이스

명세서 합계와 실제 수령액이 다른 경우:

- AC 의 acknowledge 단계에서 수재사가 "분쟁(disputed)" 처리
- → 기존 AC `cancel` (DB 트리거가 연결 거래의 `is_locked` 자동 해제)
- → 수정된 명세로 새 AC `draft` 재발행

---

## DB 입력 순서 (한 사이클 요약)

```
[1] rs_contracts                       (계약)
[2] rs_contract_shares                 (수재사 지분)
[3] rs_contract_settlement_schedules   (분기별 예상금액·납기)
[4] rs_premium_bordereau               (명세서 라인)
[5] rs_premium_receipts (inbound)      (출재사→브로커 입금)
[6] rs_account_currents + items        (수재사별 정산서 — 자동 receipt 매칭)
[7] rs_premium_receipts (outbound)     (브로커→수재사 송금)
[8] rs_settlements (선택)              (정식 결제 기록)
[9] AC status: draft → approved → reviewed → issued → acknowledged

손해 발생 시:
[A] rs_loss_bordereau                  (출재사가 보낸 손해 명세)
[B] rs_loss_claims                     (Cash Loss 청구)
[C] rs_loss_receipts (inbound)         (수재사→브로커 회수)
[D] rs_loss_receipts (outbound)        (브로커→출재사 지급)
[E] rs_account_currents (direction=to_cedant)
```

---

## 화면별 핵심 액션 매트릭스

| 단계   | 화면                                  | 핵심 버튼                                                      |
| ------ | ------------------------------------- | -------------------------------------------------------------- |
| 1      | `/contracts/new`                      | "계약 등록"                                                    |
| 2      | `/contracts/[id]`                     | "지분율 추가"                                                  |
| 3      | `/contracts/[id]` 일정 카드           | "기간 자동생성" / "수동 추가" / 행별 💾 저장                   |
| 4      | `/bordereau` 또는 `/bordereau/upload` | "보험료 명세 추가" / CSV 업로드                                |
| 5      | `/contracts/[id]` 일정 카드           | 행별 "확인" 버튼 → 모달 입력                                   |
| 6      | `/contracts/[id]` 일정 카드           | 행별 "발행" → AC 작성 → "승인 요청" → "승인" → "검수" → "발행" |
| 7      | AC 상세                               | LinkedReceiptsCard 에서 입금/송금 매칭 확인                    |
| 8      | `/settlements`                        | "결제 등록" → "송금 실행" → "송금 검수"                        |
| 보험금 | `/contracts/[id]` Loss 카드           | "기간 추가" → "입력" (회수/지급)                               |

---

## 가시화 화면

| 화면                                   | 용도                                             |
| -------------------------------------- | ------------------------------------------------ |
| `/contracts/[id]` 상단 워크플로우 카드 | 7단계 진행 + 3-Way 일치 + 수수료 추정            |
| `/premium-schedule`                    | 전체 계약의 미수령·연체·예정 KPI 와 필터 목록    |
| `/outstanding`                         | 모든 거래의 미청산 잔액 집계                     |
| `/commissions`                         | 통화별·계약별 ceding commission · brokerage 추정 |
| `/dashboard`                           | 전사 KPI                                         |
| `/receipts/upload`                     | 은행 CSV 일괄 → 후보 매칭 → 1건씩 등록           |

---

## 권한·검수 단계 (Workflow Discipline)

| 액션                  | 필요 권한                                    |
| --------------------- | -------------------------------------------- |
| 계약·명세·거래 입력   | broker_technician 이상                       |
| AC 승인 (approve)     | broker_manager                               |
| AC 검수 (review)      | reviewer 이상                                |
| AC 발행 (issue)       | broker_manager                               |
| Acknowledge (외부)    | cedant_viewer / reinsurer_viewer (수재사 측) |
| Settlement 송금       | broker_technician                            |
| Settlement 송금 검수  | reviewer 이상                                |
| AC 취소 / 사용자 관리 | admin                                        |

---

## 핵심 비즈니스 규칙 (CLAUDE.md 발췌)

| 규칙                                            | 의미                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| AC 발행 단위 = 수재사별                         | TRT-2026-001 의 1Q AC 는 Munich Re 용 + Swiss Re 용 2개 |
| Direction 자동결정                              | net_balance>0 → to_reinsurer · <0 → to_cedant           |
| AC cancelled → 거래 잠금 해제                   | DB 트리거가 자동 처리                                   |
| 환율 미등록 시 거래 저장 차단                   | 환율 등록 후 재시도                                     |
| 일련번호 (ac_no, transaction_no, settlement_no) | PostgreSQL Sequence + 트리거 자동 채번                  |
| Acknowledge                                     | 외부 뷰어가 버튼 클릭으로 상태 전환                     |
| Disputed 해결                                   | AC cancelled + 새 draft 재발행                          |
| Non-Proportional v1                             | allocation_type='manual' 강제                           |

---

## 참고 문서

- `docs/workflow.md` — 사용자 6단계 ↔ 시스템 매핑 (개념)
- `docs/사용설명서.md` — 8단계 프로세스 가이드
- `reinsurance-settlement-design-v1.2.md` — v1.3 설계 본문
- `output/step1_schema.sql` ~ `step14_loss_receipts.sql` — DB 마이그레이션 시퀀스
