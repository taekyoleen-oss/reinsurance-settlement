# 재보험 정청산 업무 흐름 (v1.7 기준)

> 본 문서는 사용자가 제시한 6단계 업무 흐름을 현재 구현 상태와 매핑하고,
> 각 단계에서 화면 → DB 테이블 → API 엔드포인트가 어떻게 연결되는지를 정리합니다.
> 인식이 잘못된 부분이나 시스템에 보완이 필요한 부분도 함께 표시합니다.

---

## 0. 등장 인물 (Actors)

| 역할                                   | 설명                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| **Cedant (출재사)**                    | 원수보험사. 보험료를 지급하고 보험금을 청구                   |
| **Reinsurer (수재사)**                 | 재보험사. 보험료를 수취하고 보험금을 지급                     |
| **Broker (중개사 = 본 시스템 운영자)** | Cedant ↔ Reinsurer 사이의 중개 + 자금 흐름 통과 + 수수료 수취 |
| **다른 Broker**                        | 공동 중개 시 수수료 분배 대상                                 |

자금 방향 (브로커 관점):

- **Premium 흐름**: Cedant → 브로커(inbound) → Reinsurer(outbound, 수수료 차감)
- **Loss 흐름**: Reinsurer → 브로커(inbound) → Cedant(outbound)
- **Brokerage**: 브로커가 보유 (premium 출금 시 차감)

---

## 1. 업무 흐름 (사용자 6단계 → 시스템 단계)

### Step 1. 계약 등록 + 보험료 정산주기 + 주기별 보험료

**사용자 표현**:

> 계약관리에서 계약과 관련된 내용을 입력하고 보험료 정산주기 및 주기별 보험료를 입력합니다.

**시스템**:

- 화면: `/contracts/new` → `/contracts/[id]` (보험료 정산 일정 카드)
- DB: `rs_contracts` (계약 본체) + `rs_contract_shares` (수재사 지분)
  → `rs_contract_settlement_schedules` (주기별 예상 보험료·납입기한)
- API: `POST /api/contracts` → `POST /api/contracts/[id]/schedules/generate`
  또는 `POST /api/contracts/[id]/schedules` (수동)
- 입력 필드:
  - 계약: contract_no, contract_type, settlement_currency, inception_date,
    expiry_date, premium_settlement_period, payment_due_days,
    ceding_commission_rate, brokerage_rate ...
  - 일정: period_label, period_from, period_to, expected_amount, due_date

✅ **현재 구현 완료**

---

### Step 2. 보험료 명세서 수신 → 입금 확인 → 계약 일치 확인 (3-way reconciliation)

**사용자 표현**:

> 계약에 따라 보험료 명세서를 받고, 이에 따른 입금 내역을 확인하여 이를
> 계약과 일치하는지 확인하고, 보험료 명세서와 맞는 지 확인합니다.
> 필요시 보험료 명세서와 계약내용의 보험료를 먼저 확인해도 됩니다.
> 이 3개가 전체적인 금액으로는 일치해야 합니다.

**시스템 (3-way matching)**:

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ ① 계약 예상  │ ≈  │ ② 명세서 합계    │ ≈  │ ③ 실제 수령액   │
│ schedule.    │    │ premium_         │    │ premium_        │
│ expected_    │    │ bordereau.       │    │ receipts.       │
│ amount       │    │ ceded_premium    │    │ received_amount │
│              │    │ SUM(period)      │    │ SUM(direction=  │
│              │    │                  │    │     'inbound')  │
└──────────────┘    └──────────────────┘    └─────────────────┘
        │                    │                       │
        └─── 같은 period_label / 기간 으로 묶음 ───┘
```

- 화면:
  - `/bordereau?contractId=...` → 명세 입력 (Premium Bordereau)
  - `/contracts/[id]` 보험료 정산 일정 카드 → 수령 확인 입력
- DB:
  - `rs_premium_bordereau` (명세 행)
  - `rs_premium_receipts` (은행 입금 사실, direction='inbound')
- API:
  - `POST /api/bordereau/premium`
  - `POST /api/contracts/[id]/schedules/[sid]/receipts`
- 일치 여부:
  - 뷰 `rs_v_schedule_receipt_summary.outstanding_amount`
  - = expected_amount − total_inbound (잔액)

⚠️ **개선 필요 → 본 PR 에서 추가**:

- 명세서 합계(②) vs 계약 예상(①) vs 수령(③) **3-way 한 번에 보이는 위젯** 신규
- 새 컴포넌트 `ContractWorkflowCard` 가 이 비교를 한 화면에서 표시

---

### Step 3. 입금 확인 완료 표시 + 미수 관리

**사용자 표현**:

> 입금이 확인되면 확인을 눌러 완료를 표시하고 미수가 있으면 관리합니다.

**시스템**:

- 화면: `/contracts/[id]` 의 정산 일정 행 → "확인" 버튼 → ReceiptConfirmDialog
- DB: `rs_premium_receipts` INSERT (direction='inbound', match_status='matched')
- 미수 관리:
  - 사이드바 `/premium-schedule` — 전체 계약의 연체·일부수령·예정 KPI
  - 사이드바 `/outstanding` — 모든 거래의 미청산 잔액 집계

✅ **현재 구현 완료**

---

### Step 4. 결제 완료 → 수재사 정산서 발행 → 송금

**사용자 표현**:

> 이를 결제를 통해 완료하고, 수재사에 금액을 확인해서 정산서를 발행하고
> 맞다면 돈을 송금합니다. 이 또한 관리하는 화면에서 확인을 눌러 단계별로 진행합니다.

**시스템**:

- 화면 1: `/contracts/[id]` 일정 행 → "발행" 버튼 → AC 작성 페이지로
  (contractId + period_from + period_to 자동 prefill)
- 화면 2: `/account-currents/new` → 수재사·기간 선택 → 생성
- 화면 3: `/account-currents/[id]` (NEW: LinkedReceiptsCard 포함)
  → draft → approve → review → issue → acknowledge → 송금
- DB:
  - `rs_account_currents` (정산서 본체) + `rs_account_current_items` (집계 항목)
  - 생성 시 `linkPremiumReceiptsToAC` 가 같은 계약·기간·상대방의 receipt 를 자동 연결
- 결제 송금:
  - `/settlements` → "결제 등록" → `rs_settlements`
  - 워크플로: pending → remitted → verified
- 단계별 확인 버튼:
  - AC: 승인요청 → 승인 → 검수 → 발행 → Acknowledge
  - Settlement: 송금실행 → 송금검수
- API:
  - `POST /api/account-currents`
  - `POST /api/account-currents/[id]/approve`, `/review`, `/issue`, `/cancel`
  - `POST /api/settlements`, `/[id]/remit`, `/verify-remit`

✅ **현재 구현 완료** (단계별 stepper 포함)

---

### Step 5. 수수료 관리 + 다른 중개사 정산서

**사용자 표현**:

> 이때 발생되는 수수료는 확인하여 관리하고, 다른 중개사에 보낼 금액이 있다면
> 이 또한 정산서를 발행하여 금액 등을 관리합니다.

**시스템 - 수수료**:

- 계약에 `ceding_commission_rate`, `profit_commission_rate`, `brokerage_rate`,
  `brokerage_amount` 필드 보유
- 거래 종류: `rs_transactions.transaction_type = 'commission'`
- AC 항목: `rs_account_current_items.transaction_type = 'commission'`
- 자동 계산: PremiumScheduleCard 의 outbound 송금 시 `(1 - commission_rate)` 차감 적용

**다른 중개사 (Co-broker)**:

- `rs_counterparties.company_type = 'broker'` 로 등록 가능
  (CompanyType 에 'broker' 포함됨 — types/database.ts)
- 다른 브로커는 일반 거래상대방으로 취급되어 AC/Settlement 발행 가능

⚠️ **명시적 보완 여지**:

- 수수료만 별도 관리하는 화면이 부족함 (지금은 AC 안에서만 보임)
- 본 PR 에서는 ContractWorkflowCard 가 누적 수수료를 함께 표시하도록 함

---

### Step 6. 보험금(Loss) 흐름 — 수재사 명세 → 분배 발송 → 입금 → 송금 → 완료

**사용자 표현**:

> 보험금은 출재사에게서 명세서를 받아 이를 확인하여 이를 수재사에도 배분하여
> 발송하고, 이를 입금되면 이를 계약 및 명세서와 확인하여 확인 후 이를 수재사의
> 명세서 요청대로 송금하고 이를 계약 내용 및 결제를 하고 완료합니다.

**보험금 자금 흐름** (브로커 관점):

```
출재사 손해 명세 (Loss Bordereau)
        ↓
  계약·명세 확인 (3-way 와 동일하게: 계약 회수율 vs 명세 vs 실제)
        ↓
  수재사에 분배·청구 (AC 발행 — direction='to_cedant', 즉 결국 출재사로 흘러감)
        ↓
  수재사로부터 보험금 입금 (Loss money inbound)
        ↓
  출재사에 보험금 송금 (Loss money outbound)
        ↓
  결제 완료
```

**시스템 - Loss 측 매핑**:

- 명세: `rs_loss_bordereau` (cedant 가 보낸 손해 라인)
- 청구: `rs_loss_claims` (cash loss 등 별도 청구)
- 거래: `rs_transactions.transaction_type = 'loss'`
- AC: `rs_account_current_items.transaction_type = 'loss'`
  direction='to_cedant' 인 AC 가 보험금 환급 청구
- 결제: `rs_settlements` 가 송금 사실 기록

⚠️ **현재 한계 (보완 권장)**:

- `rs_premium_receipts` 는 이름 그대로 **Premium 전용**.
  Loss 측의 "은행에서 들어온 보험금 사실 기록" 은 별도 테이블 없음.
  현재는 `rs_settlements.remit_status` 와 `rs_transactions` 로 추적.
- 향후 step14 SQL 로 `rs_loss_receipts` 도입을 권장 (rs_premium_receipts 와 동일 구조).
- 본 PR 에서는 UI 통합만 진행하고, Loss receipt 테이블 추가는 별도 작업으로 분리.

---

## 2. DB 입력 순서 (정상 flow 기준 한 사이클)

```
1) rs_contracts                        — 계약 신규
2) rs_contract_shares                  — 수재사 지분
3) rs_contract_settlement_schedules    — 주기별 예상금액·납기 (생성/수동)
4) rs_premium_bordereau                — 명세서 입력 (period_yyyyqn 매칭)
5) rs_transactions  (premium)          — (선택) 명세→거래 등록
6) rs_premium_receipts (inbound)       — 출재사 입금 확인 (은행 사실)
7) rs_account_currents                 — 정산서 발행 (자동 receipt 매칭)
   + rs_account_current_items          — premium / commission 등 집계
8) rs_premium_receipts (outbound)      — 수재사 송금 사실 (수수료 차감)
9) rs_settlements                      — 결제 실행 기록 (remit/verify)
10) AC 상태:  draft → approved → reviewed → issued → acknowledged
11) Loss 발생 시:
    rs_loss_bordereau → rs_loss_claims → rs_transactions(loss) →
    rs_account_currents(direction='to_cedant') → rs_settlements
```

---

## 3. 사용자 인식 vs 시스템 정합성 검토

| #   | 사용자 표현                                 | 시스템 매칭                                    | 정합성                                                       |
| --- | ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| 1   | 계약+정산주기+주기별 보험료 입력            | rs_contracts + schedules                       | ✅ 일치                                                      |
| 2   | 명세 ↔ 입금 ↔ 계약 3-way 일치 확인          | bordereau · receipts · schedules               | ⚠️ **3-way 위젯 미흡 → 본 PR 보완**                          |
| 3   | 입금 확인 완료 표시 / 미수 관리             | ReceiptConfirmDialog + /premium-schedule       | ✅ 일치                                                      |
| 4   | 수재사 정산서 발행 + 송금 (단계별)          | AC stepper + Settlement remit/verify           | ✅ 일치                                                      |
| 5   | 수수료 관리 + 다른 중개사 송금              | commission tx + AC items + broker counterparty | ⚠️ **수수료 단독 화면 미흡**                                 |
| 6   | 보험금: 출재사 명세 → 수재사 분배·입금→송금 | loss_bordereau + AC(to_cedant) + settlement    | ⚠️ **loss_receipts 테이블 부재 (현재는 settlement 로 대체)** |

---

## 4. 본 PR 에서 추가하는 보완 (구현 완료)

1. **`/api/contracts/[id]/workflow`**
   계약별 7단계(계약→지분→일정→명세→수령→AC→결제)의 카운트·합계·일치율을
   한 번에 반환하는 집계 API.

2. **`ContractWorkflowCard` (계약 상세 상단)**
   - 7단계 progress 시각화 (각 단계별 ✓/⚠️/×)
   - **3-way 대조 위젯**:
     - 계약 예상 (Σ schedules.expected_amount)
     - 명세 합계 (Σ premium_bordereau.ceded_premium)
     - 수령 합계 (Σ premium_receipts inbound)
     - 일치 표시 (1% 오차 이내 = 초록, 미달 = 노랑, 초과 = 빨강)
   - 수수료 누적 표시 (estimated brokerage / commission)
   - 미수 잔액 / 미지급 잔액 / AC 상태 분포 / Settlement 상태 분포

3. **사이드바 워크플로우 step indicator** 는 기존 `ProcessStepIndicator`
   유지, 단계 매핑을 본 문서 기준으로 통일.

---

## 5. 향후 권장 (별도 작업)

- **step14 SQL: `rs_loss_receipts` 테이블 도입** —
  Loss 측 은행 입금/송금 사실 기록 (현재는 rs_settlements 로 대체 중)
- **수수료 전용 대시보드** —
  brokerage / ceding commission / profit commission 누적 현황
- **다른 브로커 (co-broker) 분배 화면** —
  계약별 broker counterparty 별 수수료 분배 룰 설정 + AC 자동 발행
- **CSV 일괄 업로드 확장** —
  지금은 명세 CSV 만 지원. 수령(receipts) 도 은행 거래내역 CSV 매칭 지원 권장.
