-- =============================================================================
-- step14_loss_receipts.sql
-- 손해(보험금) 수령 확인 — Loss Receipt Confirmation
--
-- 대칭 구조:
--   rs_premium_receipts : 보험료 흐름 (Cedant → Broker → Reinsurer)
--   rs_loss_receipts    : 보험금 흐름 (Reinsurer → Broker → Cedant)
--
-- 방향 (브로커 관점):
--   inbound  = 브로커가 수령 (수재사 → 브로커 보험금)
--   outbound = 브로커가 송금 (브로커 → 출재사 보험금)
--
-- 전제: step8_premium_receipts.sql 적용 완료
-- =============================================================================

-- 1. rs_loss_receipts — 실제 보험금 수령/송금 확인 내역
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rs_loss_receipts (
    id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 연결 대상 (loss 스케줄)
    schedule_id           uuid          NOT NULL
                              REFERENCES rs_contract_settlement_schedules(id) ON DELETE RESTRICT,
    contract_id           uuid          NOT NULL
                              REFERENCES rs_contracts(id) ON DELETE RESTRICT,
    counterparty_id       uuid          NOT NULL
                              REFERENCES rs_counterparties(id),

    -- 청구(claim) 연결 (선택)
    claim_id              uuid          REFERENCES rs_loss_claims(id),

    -- 방향 (브로커 관점)
    direction             text          NOT NULL DEFAULT 'inbound'
                              CHECK (direction IN ('inbound', 'outbound')),

    -- 실제 금액
    received_date         date          NOT NULL,
    received_amount       numeric(18,2) NOT NULL CHECK (received_amount > 0),
    received_currency     char(3)       NOT NULL REFERENCES rs_currencies(code),
    exchange_rate         numeric(12,6) NOT NULL DEFAULT 1,
    received_amount_krw   numeric(18,2),

    -- 은행 / 참조
    bank_reference        text,
    receipt_note          text,

    -- 거래·정산서 연결
    linked_transaction_id uuid          REFERENCES rs_transactions(id),
    linked_ac_id          uuid          REFERENCES rs_account_currents(id),

    -- 매칭 상태
    match_status          text          NOT NULL DEFAULT 'unmatched'
                              CHECK (match_status IN ('unmatched', 'partial', 'matched')),

    -- 메타
    confirmed_by          uuid          REFERENCES auth.users(id),
    created_at            timestamptz   NOT NULL DEFAULT now(),
    updated_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_loss_receipts IS
  '정산 스케줄(loss)별 실제 보험금 수령/송금 확인 내역. 브로커가 은행 확인 후 수동 입력. inbound=수재사→브로커, outbound=브로커→출재사';

-- 2. updated_at 트리거
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_loss_receipts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loss_receipts_updated_at ON rs_loss_receipts;
CREATE TRIGGER trg_loss_receipts_updated_at
  BEFORE UPDATE ON rs_loss_receipts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_loss_receipts_updated_at();

-- 3. KRW 자동 환산 트리거
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_loss_receipt_calc_krw()
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

DROP TRIGGER IF EXISTS trg_loss_receipt_calc_krw ON rs_loss_receipts;
CREATE TRIGGER trg_loss_receipt_calc_krw
  BEFORE INSERT OR UPDATE ON rs_loss_receipts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_loss_receipt_calc_krw();

-- 4. 인덱스
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loss_receipts_schedule    ON rs_loss_receipts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_loss_receipts_contract    ON rs_loss_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_loss_receipts_counterparty ON rs_loss_receipts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_loss_receipts_date         ON rs_loss_receipts(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_loss_receipts_claim        ON rs_loss_receipts(claim_id)
    WHERE claim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loss_receipts_match        ON rs_loss_receipts(match_status)
    WHERE match_status != 'matched';
CREATE INDEX IF NOT EXISTS idx_loss_receipts_ac           ON rs_loss_receipts(linked_ac_id)
    WHERE linked_ac_id IS NOT NULL;

-- 5. RLS — broker 전용 (step12 패턴: 헬퍼 함수 1회 호출, 외부 뷰어 직접 JOIN 회피)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rs_loss_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loss_receipts_broker_all" ON rs_loss_receipts;
CREATE POLICY "loss_receipts_broker_all"
    ON rs_loss_receipts
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- 6. 뷰 — 손해 스케줄별 수령 현황 집계 (rs_v_loss_schedule_receipt_summary)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW rs_v_loss_schedule_receipt_summary AS
SELECT
    s.id                                            AS schedule_id,
    s.contract_id,
    s.schedule_type,
    s.period_label,
    s.period_from,
    s.period_to,
    s.due_date,
    s.expected_amount,
    s.currency_code,
    s.status                                        AS schedule_status,
    COUNT(r.id)                                     AS receipt_count,
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)   AS total_inbound,   -- 수재사→브로커
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'outbound'), 0)  AS total_outbound,  -- 브로커→출재사
    COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)
    - COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'outbound'), 0)  AS net_received,
    MAX(r.received_date)                            AS last_received_date,
    -- 수령 상태
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
    COALESCE(s.expected_amount, 0)
    - COALESCE(SUM(r.received_amount)
      FILTER (WHERE r.direction = 'inbound'), 0)   AS outstanding_amount
FROM rs_contract_settlement_schedules s
LEFT JOIN rs_loss_receipts r ON r.schedule_id = s.id
WHERE s.schedule_type = 'loss'
GROUP BY
    s.id, s.contract_id, s.schedule_type, s.period_label,
    s.period_from, s.period_to, s.due_date,
    s.expected_amount, s.currency_code, s.status;

COMMENT ON VIEW rs_v_loss_schedule_receipt_summary IS
  '손해(loss) 스케줄별 보험금 수령 현황 집계 뷰';

NOTIFY pgrst, 'reload schema';

-- =============================================================================
SELECT '✅ step14_loss_receipts: rs_loss_receipts + view + RLS 적용 완료' AS result;
