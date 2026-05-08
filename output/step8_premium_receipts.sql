-- =============================================================================
-- step8_premium_receipts.sql
-- 보험료 수령 확인 (Premium Receipt Confirmation) — v1.0
-- 계약 정산 스케줄과 실제 입출금을 연결하는 핵심 테이블
--
-- 프로세스:
--   계약 → 정산 스케줄(expected_amount + due_date) → 수령 확인 입력
--   → 거래 항목 연결 → 정산서(AC) 연결 → 정산 완료
-- =============================================================================

-- 1. rs_contract_settlement_schedules에 납입 기한 및 최저보험료 컬럼 추가
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rs_contract_settlement_schedules
  ADD COLUMN IF NOT EXISTS due_date        date,
  ADD COLUMN IF NOT EXISTS minimum_premium numeric(18,2);

COMMENT ON COLUMN rs_contract_settlement_schedules.due_date IS
  '납입 기한 — 이 기한까지 보험료 수령이 완료되어야 함. 초과 시 연체(overdue) 상태 표시';
COMMENT ON COLUMN rs_contract_settlement_schedules.minimum_premium IS
  '최저 보험료 (Minimum Premium). 비례재보험 선납(Deposit Premium) 구조에서 사용';

-- 2. rs_premium_receipts — 실제 보험료 수령/송금 확인 내역
-- ─────────────────────────────────────────────────────────────────────────────
-- 브로커가 은행 계좌를 확인하고 수동으로 입력하는 테이블
-- 각 정산 스케줄(기간)에 대해 복수의 수령 건 가능 (분할 수령, 선납 등)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rs_premium_receipts (
    id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 연결 대상
    schedule_id           uuid          NOT NULL
                              REFERENCES rs_contract_settlement_schedules(id) ON DELETE RESTRICT,
    contract_id           uuid          NOT NULL
                              REFERENCES rs_contracts(id) ON DELETE RESTRICT,
    counterparty_id       uuid          NOT NULL
                              REFERENCES rs_counterparties(id),

    -- 방향 (브로커 관점)
    -- inbound  = 브로커가 수령 (출재사→브로커 보험료, 수재사→브로커 정산 등)
    -- outbound = 브로커가 송금 (브로커→수재사 보험료 납입, 브로커→출재사 손해금 등)
    direction             text          NOT NULL DEFAULT 'inbound'
                              CHECK (direction IN ('inbound', 'outbound')),

    -- 실제 금액 (사용자가 은행 확인 후 입력)
    received_date         date          NOT NULL,
    received_amount       numeric(18,2) NOT NULL CHECK (received_amount > 0),
    received_currency     char(3)       NOT NULL REFERENCES rs_currencies(code),
    exchange_rate         numeric(12,6) NOT NULL DEFAULT 1,
    received_amount_krw   numeric(18,2),

    -- 은행/참조 정보 (감사 추적용)
    bank_reference        text,         -- 이체 참조번호, SWIFT ref, 전신환 번호 등
    receipt_note          text,         -- 비고 (분할 수령 사유, 환율 협의 내용 등)

    -- 거래 항목 연결 (rs_transactions)
    -- 보험료 수령이 시스템 내 거래 항목과 연결될 때 설정
    linked_transaction_id uuid          REFERENCES rs_transactions(id),

    -- 정산서 연결 (rs_account_currents)
    -- 해당 수령이 어떤 AC(SOA)에 반영되었는지 추적
    linked_ac_id          uuid          REFERENCES rs_account_currents(id),

    -- 매칭 상태 (스케줄 expected_amount 대비 이 수령 건의 상태)
    -- unmatched  : 거래/AC와 미연결
    -- partial    : 일부 금액만 거래/AC와 연결
    -- matched    : 전액 연결 완료
    match_status          text          NOT NULL DEFAULT 'unmatched'
                              CHECK (match_status IN ('unmatched', 'partial', 'matched')),

    -- 메타
    confirmed_by          uuid          REFERENCES auth.users(id),
    created_at            timestamptz   NOT NULL DEFAULT now(),
    updated_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_premium_receipts IS
  '정산 스케줄별 실제 보험료 수령/송금 확인 내역. 브로커가 은행 확인 후 수동 입력. 복수 건 가능(분할/선납)';
COMMENT ON COLUMN rs_premium_receipts.direction IS
  'inbound=브로커 수령(출재사→브로커), outbound=브로커 송금(브로커→수재사). 브로커 관점 기준';
COMMENT ON COLUMN rs_premium_receipts.bank_reference IS
  '은행 이체 참조번호 / SWIFT CUG ref / 전신환 번호 — 감사 추적 핵심 정보';
COMMENT ON COLUMN rs_premium_receipts.match_status IS
  '거래 항목/AC 연결 여부: unmatched=미연결, partial=일부연결, matched=전액연결';

-- 3. updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_premium_receipts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_premium_receipts_updated_at ON rs_premium_receipts;
CREATE TRIGGER trg_premium_receipts_updated_at
  BEFORE UPDATE ON rs_premium_receipts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_premium_receipts_updated_at();

-- 4. KRW 자동 환산 트리거 (INSERT / UPDATE 시)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_premium_receipt_calc_krw()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.received_currency = 'KRW' THEN
    NEW.received_amount_krw := NEW.received_amount;
    NEW.exchange_rate := 1;
  ELSIF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate > 0 THEN
    NEW.received_amount_krw := ROUND(NEW.received_amount * NEW.exchange_rate, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_premium_receipt_calc_krw ON rs_premium_receipts;
CREATE TRIGGER trg_premium_receipt_calc_krw
  BEFORE INSERT OR UPDATE ON rs_premium_receipts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_premium_receipt_calc_krw();

-- 5. 인덱스
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_premium_receipts_schedule
  ON rs_premium_receipts(schedule_id);

CREATE INDEX IF NOT EXISTS idx_premium_receipts_contract
  ON rs_premium_receipts(contract_id);

CREATE INDEX IF NOT EXISTS idx_premium_receipts_counterparty
  ON rs_premium_receipts(counterparty_id);

CREATE INDEX IF NOT EXISTS idx_premium_receipts_date
  ON rs_premium_receipts(received_date DESC);

CREATE INDEX IF NOT EXISTS idx_premium_receipts_match
  ON rs_premium_receipts(match_status)
  WHERE match_status != 'matched';

CREATE INDEX IF NOT EXISTS idx_premium_receipts_tx
  ON rs_premium_receipts(linked_transaction_id)
  WHERE linked_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_premium_receipts_ac
  ON rs_premium_receipts(linked_ac_id)
  WHERE linked_ac_id IS NOT NULL;

-- 6. Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rs_premium_receipts ENABLE ROW LEVEL SECURITY;

-- 브로커 내부 직원 및 관리자: 전체 CRUD
CREATE POLICY "broker_full_access_premium_receipts"
  ON rs_premium_receipts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rs_user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('broker_technician', 'broker_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rs_user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('broker_technician', 'broker_manager', 'admin')
    )
  );

-- 외부 뷰어(출재사/수재사): 자신과 관련된 계약의 수령 내역 읽기 전용
CREATE POLICY "external_read_premium_receipts"
  ON rs_premium_receipts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM rs_user_profiles up
      JOIN rs_contracts c ON c.id = rs_premium_receipts.contract_id
      WHERE up.user_id = auth.uid()
        AND up.role IN ('cedant_viewer', 'reinsurer_viewer')
        AND (
          c.cedant_id = up.company_id
          OR EXISTS (
            SELECT 1 FROM rs_contract_shares cs
            WHERE cs.contract_id = c.id
              AND cs.reinsurer_id = up.company_id
          )
        )
    )
  );

-- 7. 수령 집계 뷰 — 스케줄별 수령 현황 요약
-- ─────────────────────────────────────────────────────────────────────────────
-- 스케줄별로 수령 건수, 총 수령 금액, 마지막 수령일을 집계하여 뷰로 제공
CREATE OR REPLACE VIEW rs_v_schedule_receipt_summary AS
SELECT
    s.id                                            AS schedule_id,
    s.contract_id,
    s.schedule_type,
    s.period_label,
    s.period_from,
    s.period_to,
    s.due_date,
    s.expected_amount,
    s.minimum_premium,
    s.currency_code,
    s.status                                        AS schedule_status,
    COUNT(r.id)                                     AS receipt_count,
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)   AS total_inbound,
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'outbound'), 0)  AS total_outbound,
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)
    - COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'outbound'), 0)  AS net_received,
    MAX(r.received_date)                            AS last_received_date,
    -- 수령 상태 계산 (실무 기준)
    CASE
      WHEN s.expected_amount IS NULL OR s.expected_amount = 0
        THEN 'no_schedule'
      WHEN COALESCE(SUM(r.received_amount) FILTER (WHERE r.direction = 'inbound'), 0) = 0 THEN
        CASE
          WHEN s.due_date IS NOT NULL AND s.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'pending'
        END
      WHEN COALESCE(SUM(r.received_amount) FILTER (WHERE r.direction = 'inbound'), 0)
           >= s.expected_amount THEN 'fully_received'
      ELSE
        CASE
          WHEN s.due_date IS NOT NULL AND s.due_date < CURRENT_DATE THEN 'overdue_partial'
          ELSE 'partially_received'
        END
    END                                             AS receipt_status,
    -- 잔액 (예상 - 수령)
    COALESCE(s.expected_amount, 0)
    - COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)   AS outstanding_amount
FROM rs_contract_settlement_schedules s
LEFT JOIN rs_premium_receipts r ON r.schedule_id = s.id
GROUP BY
    s.id, s.contract_id, s.schedule_type, s.period_label,
    s.period_from, s.period_to, s.due_date,
    s.expected_amount, s.minimum_premium, s.currency_code, s.status;

COMMENT ON VIEW rs_v_schedule_receipt_summary IS
  '스케줄별 보험료 수령 현황 집계 뷰. 예상 금액 대비 실제 수령 총액, 잔액, 수령 상태 실시간 계산';
