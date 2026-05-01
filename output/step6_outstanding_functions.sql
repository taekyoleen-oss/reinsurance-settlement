-- ============================================================
-- Step 6: Outstanding / Aging Postgres RPC functions
-- 목적: JS Map 집계를 DB 집계로 이전, adminClient 의존성 제거
-- SECURITY DEFINER: RLS를 함수 소유자 권한으로 우회
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 헬퍼: 계약 범위 결정 (contract_ids 배열 반환)
--   NULL 반환 → 필터 없음 (전체)
--   빈 배열 반환 → 결과 없음
-- ──────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────
-- 1. 통화별 미청산 집계
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rs_calc_outstanding(
  p_counterparty_id uuid DEFAULT NULL,
  p_currency_code   text DEFAULT NULL,
  p_contract_id     uuid DEFAULT NULL,
  p_cedant_id       uuid DEFAULT NULL
)
RETURNS TABLE (
  currency   text,
  receivable numeric,
  payable    numeric,
  net        numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_ids uuid[];
  v_check_cedant uuid;
BEGIN
  -- Contract scope resolution
  IF p_contract_id IS NOT NULL THEN
    IF p_cedant_id IS NOT NULL THEN
      SELECT cedant_id INTO v_check_cedant
      FROM rs_contracts WHERE id = p_contract_id;
      IF v_check_cedant IS DISTINCT FROM p_cedant_id THEN
        RETURN; -- cedant mismatch → empty
      END IF;
    END IF;
    v_contract_ids := ARRAY[p_contract_id];
  ELSIF p_cedant_id IS NOT NULL THEN
    SELECT ARRAY(SELECT id FROM rs_contracts WHERE cedant_id = p_cedant_id)
    INTO v_contract_ids;
    IF array_length(v_contract_ids, 1) IS NULL THEN
      RETURN; -- no contracts for cedant → empty
    END IF;
  END IF;
  -- v_contract_ids IS NULL → no contract filter

  RETURN QUERY
  SELECT
    t.currency_code::text                                                               AS currency,
    COALESCE(SUM(t.amount_original) FILTER (WHERE t.direction = 'receivable'), 0)      AS receivable,
    COALESCE(SUM(t.amount_original) FILTER (WHERE t.direction = 'payable'),    0)      AS payable,
    COALESCE(SUM(t.amount_original) FILTER (WHERE t.direction = 'receivable'), 0)
      - COALESCE(SUM(t.amount_original) FILTER (WHERE t.direction = 'payable'), 0)     AS net
  FROM rs_transactions t
  WHERE t.is_allocation_parent = false
    AND t.is_deleted            = false
    AND t.status IN ('confirmed', 'billed')
    AND (p_counterparty_id IS NULL OR t.counterparty_id = p_counterparty_id)
    AND (p_currency_code   IS NULL OR t.currency_code   = p_currency_code)
    AND (v_contract_ids    IS NULL OR t.contract_id     = ANY(v_contract_ids))
  GROUP BY t.currency_code;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 2. 거래상대방 + 통화 단위 Aging 분석
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rs_calc_aging(
  p_counterparty_id uuid DEFAULT NULL,
  p_contract_id     uuid DEFAULT NULL,
  p_cedant_id       uuid DEFAULT NULL
)
RETURNS TABLE (
  counterparty   text,
  currency       text,
  current_amount numeric,
  days_1_30      numeric,
  days_31_60     numeric,
  days_61_90     numeric,
  days_over_90   numeric,
  total          numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_ids uuid[];
  v_check_cedant uuid;
BEGIN
  IF p_contract_id IS NOT NULL THEN
    IF p_cedant_id IS NOT NULL THEN
      SELECT cedant_id INTO v_check_cedant
      FROM rs_contracts WHERE id = p_contract_id;
      IF v_check_cedant IS DISTINCT FROM p_cedant_id THEN RETURN; END IF;
    END IF;
    v_contract_ids := ARRAY[p_contract_id];
  ELSIF p_cedant_id IS NOT NULL THEN
    SELECT ARRAY(SELECT id FROM rs_contracts WHERE cedant_id = p_cedant_id)
    INTO v_contract_ids;
    IF array_length(v_contract_ids, 1) IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      cp.company_name_ko::text AS cp_name,
      t.currency_code::text    AS curr,
      CASE WHEN t.direction = 'receivable'
        THEN  t.amount_original
        ELSE -t.amount_original
      END                      AS net_amount,
      CASE
        WHEN t.due_date IS NULL            THEN 'current'
        WHEN CURRENT_DATE <= t.due_date    THEN 'current'
        WHEN CURRENT_DATE - t.due_date <= 30 THEN '1-30'
        WHEN CURRENT_DATE - t.due_date <= 60 THEN '31-60'
        WHEN CURRENT_DATE - t.due_date <= 90 THEN '61-90'
        ELSE '90+'
      END                      AS bucket
    FROM rs_transactions t
    JOIN rs_counterparties cp ON cp.id = t.counterparty_id
    WHERE t.is_allocation_parent = false
      AND t.is_deleted            = false
      AND t.status IN ('confirmed', 'billed')
      AND (p_counterparty_id IS NULL OR t.counterparty_id = p_counterparty_id)
      AND (v_contract_ids    IS NULL OR t.contract_id     = ANY(v_contract_ids))
  )
  SELECT
    cp_name,
    curr,
    COALESCE(SUM(net_amount) FILTER (WHERE bucket = 'current'), 0),
    COALESCE(SUM(net_amount) FILTER (WHERE bucket = '1-30'),    0),
    COALESCE(SUM(net_amount) FILTER (WHERE bucket = '31-60'),   0),
    COALESCE(SUM(net_amount) FILTER (WHERE bucket = '61-90'),   0),
    COALESCE(SUM(net_amount) FILTER (WHERE bucket = '90+'),     0),
    COALESCE(SUM(net_amount),                                   0)
  FROM base
  GROUP BY cp_name, curr
  ORDER BY cp_name, curr;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 3. 거래별 미청산 상세 목록
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rs_calc_outstanding_detail(
  p_counterparty_id uuid DEFAULT NULL,
  p_currency_code   text DEFAULT NULL,
  p_contract_id     uuid DEFAULT NULL,
  p_cedant_id       uuid DEFAULT NULL
)
RETURNS TABLE (
  counterparty_id   uuid,
  counterparty_name text,
  contract_id       uuid,
  contract_no       text,
  currency_code     text,
  direction         text,
  amount            numeric,
  due_date          date,
  aging_bucket      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_ids uuid[];
  v_check_cedant uuid;
BEGIN
  IF p_contract_id IS NOT NULL THEN
    IF p_cedant_id IS NOT NULL THEN
      SELECT cedant_id INTO v_check_cedant
      FROM rs_contracts WHERE id = p_contract_id;
      IF v_check_cedant IS DISTINCT FROM p_cedant_id THEN RETURN; END IF;
    END IF;
    v_contract_ids := ARRAY[p_contract_id];
  ELSIF p_cedant_id IS NOT NULL THEN
    SELECT ARRAY(SELECT id FROM rs_contracts WHERE cedant_id = p_cedant_id)
    INTO v_contract_ids;
    IF array_length(v_contract_ids, 1) IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT
    t.counterparty_id,
    cp.company_name_ko::text,
    t.contract_id,
    c.contract_no::text,
    t.currency_code::text,
    t.direction::text,
    t.amount_original                 AS amount,
    t.due_date,
    CASE
      WHEN t.due_date IS NULL              THEN 'current'
      WHEN CURRENT_DATE <= t.due_date      THEN 'current'
      WHEN CURRENT_DATE - t.due_date <= 30 THEN '1-30'
      WHEN CURRENT_DATE - t.due_date <= 60 THEN '31-60'
      WHEN CURRENT_DATE - t.due_date <= 90 THEN '61-90'
      ELSE '90+'
    END::text                         AS aging_bucket
  FROM rs_transactions t
  JOIN rs_counterparties cp ON cp.id = t.counterparty_id
  JOIN rs_contracts       c  ON c.id  = t.contract_id
  WHERE t.is_allocation_parent = false
    AND t.is_deleted            = false
    AND t.status IN ('confirmed', 'billed')
    AND (p_counterparty_id IS NULL OR t.counterparty_id = p_counterparty_id)
    AND (p_currency_code   IS NULL OR t.currency_code   = p_currency_code)
    AND (v_contract_ids    IS NULL OR t.contract_id     = ANY(v_contract_ids))
  ORDER BY t.due_date ASC NULLS LAST;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 권한: anon / authenticated 역할에서 EXECUTE 허용
-- SECURITY DEFINER이므로 실제 데이터 접근은 함수 소유자 권한으로 수행
-- ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION rs_calc_outstanding(uuid, text, uuid, uuid)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rs_calc_aging(uuid, uuid, uuid)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rs_calc_outstanding_detail(uuid, text, uuid, uuid) TO anon, authenticated;
