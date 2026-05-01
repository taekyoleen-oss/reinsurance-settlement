-- ============================================================
-- Phase 1 C1: 발행/배분 트랜잭션 원자화
-- 적용 방법: Supabase 대시보드 SQL Editor에서 실행
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- rs_issue_account_current(p_ac_id uuid)
-- AC 발행: 스냅샷 저장 + 거래 잠금 + 상태 변경을 단일 트랜잭션으로
-- Route에서 호출: supabase.rpc('rs_issue_account_current', { p_ac_id: id })
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rs_issue_account_current(p_ac_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status      text;
  v_contract_id uuid;
  v_cp_id       uuid;
  v_period_from date;
  v_period_to   date;
BEGIN
  -- 1. AC 조회 및 행 잠금 (advisory lock으로 race condition 방지)
  PERFORM pg_advisory_xact_lock(hashtext(p_ac_id::text));

  SELECT status, contract_id, counterparty_id, period_from, period_to
  INTO v_status, v_contract_id, v_cp_id, v_period_from, v_period_to
  FROM rs_account_currents
  WHERE id = p_ac_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AC를 찾을 수 없습니다: %', p_ac_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status NOT IN ('draft', 'approved') THEN
    RAISE EXCEPTION '발행할 수 없는 상태입니다. 현재 상태: %', v_status
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. 기존 스냅샷 삭제 후 재생성
  DELETE FROM rs_account_current_items WHERE ac_id = p_ac_id;

  INSERT INTO rs_account_current_items (
    ac_id,
    tx_id,
    transaction_type,
    description,
    amount_original,
    currency_code,
    exchange_rate,
    amount_settlement_currency,
    direction,
    snapshot_date
  )
  SELECT
    p_ac_id,
    t.id,
    t.transaction_type,
    t.description,
    t.amount_original,
    t.currency_code,
    t.exchange_rate,
    t.amount_original * COALESCE(t.exchange_rate, 1),
    t.direction,
    NOW()
  FROM rs_transactions t
  WHERE t.contract_id   = v_contract_id
    AND t.counterparty_id = v_cp_id
    AND t.is_allocation_parent = false
    AND t.is_deleted = false
    AND t.status IN ('confirmed', 'billed')
    AND t.period_from >= v_period_from
    AND t.period_to   <= v_period_to;

  -- 3. 연결 거래 잠금
  UPDATE rs_transactions
  SET
    is_locked  = true,
    updated_at = NOW()
  WHERE contract_id     = v_contract_id
    AND counterparty_id = v_cp_id
    AND is_allocation_parent = false
    AND is_deleted = false
    AND status IN ('confirmed', 'billed')
    AND period_from >= v_period_from
    AND period_to   <= v_period_to;

  -- 4. AC 상태 issued로 변경
  UPDATE rs_account_currents
  SET
    status     = 'issued',
    updated_at = NOW()
  WHERE id = p_ac_id;

END;
$$;

COMMENT ON FUNCTION rs_issue_account_current(uuid) IS
  'AC 발행을 단일 트랜잭션으로 처리: 스냅샷 저장 → 거래 잠금 → 상태 issued';


-- ────────────────────────────────────────────────────────────
-- rs_cancel_account_current(p_ac_id uuid)
-- AC 취소: 연결 거래 is_locked=false + AC 상태 cancelled (기존 DB 트리거 대체 함수)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rs_cancel_account_current(p_ac_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_ac_id::text));

  SELECT status INTO v_status
  FROM rs_account_currents
  WHERE id = p_ac_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AC를 찾을 수 없습니다: %', p_ac_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION '이미 취소된 정산서입니다.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 연결 거래 잠금 해제
  UPDATE rs_transactions
  SET is_locked = false, updated_at = NOW()
  WHERE account_current_id = p_ac_id;

  -- AC 상태 변경
  UPDATE rs_account_currents
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_ac_id;

END;
$$;

COMMENT ON FUNCTION rs_cancel_account_current(uuid) IS
  'AC 취소를 단일 트랜잭션으로 처리: 거래 잠금 해제 → 상태 cancelled';
