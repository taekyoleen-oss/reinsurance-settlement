-- =============================================================================
-- step13_scenario_data.sql
-- 모든 active 계약을 대상으로 정산주기에 맞춘 가상 시나리오 데이터 생성.
--
-- 시나리오 구성 (오늘 기준 다양한 상태가 한 화면에 보이도록):
--   • 정산주기: 계약의 premium_settlement_period 사용 (NULL → settlement_period → 'quarterly')
--   • 예상금액: 통화·주기 기준 (USD 분기 250K / 반기 500K / 연 1M ; KRW 250M / 500M / 1B)
--   • 기간 분할: inception_date ~ expiry_date 를 주기에 맞춰 자동 분할 (adhoc 은 1건)
--   • 납기:    period_to + payment_due_days (없으면 15일)
--   • 수령상태(due_date 와 today 비교 + 인덱스 패턴):
--       완납  → inbound 1건 + outbound (출재사 대비 수수료 차감) 1건 → match=matched
--       부분  → inbound 1건 (60% 수령)                              → match=partial
--       연체  → 수령 없음                                            → match=unmatched
--       예정  → 수령 없음                                            → match=unmatched
--
-- 명세서: 각 보험료 스케줄당 premium_bordereau 1행 (period_yyyyqn 매칭)
--
-- 멱등성: 실행 시 기존 스케줄/수령/명세 정리 후 재생성 (transaction_id 가 연결된
--         명세는 보존). DO 블록 1회 실행하면 시나리오가 깨끗하게 재구성됨.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. premium_settlement_period 기본값 보정
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE rs_contracts
   SET premium_settlement_period = COALESCE(NULLIF(premium_settlement_period, ''),
                                            NULLIF(settlement_period, ''),
                                            'quarterly')
 WHERE premium_settlement_period IS NULL
    OR premium_settlement_period = ''
    OR premium_settlement_period NOT IN ('quarterly','semiannual','annual','adhoc');

-- payment_due_days 기본값 (NULL → 15)
UPDATE rs_contracts
   SET payment_due_days = COALESCE(payment_due_days, 15)
 WHERE payment_due_days IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 기존 시나리오 데이터 정리 (active 계약의 premium 스케줄·수령·미연결 명세)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM rs_premium_receipts
 WHERE contract_id IN (SELECT id FROM rs_contracts WHERE status = 'active');

DELETE FROM rs_contract_settlement_schedules
 WHERE schedule_type = 'premium'
   AND contract_id IN (SELECT id FROM rs_contracts WHERE status = 'active');

-- premium_bordereau 는 transaction 미연결 + loss_bordereau 에서 미참조인 행만 삭제
DELETE FROM rs_premium_bordereau pb
 WHERE pb.transaction_id IS NULL
   AND pb.contract_id IN (SELECT id FROM rs_contracts WHERE status = 'active')
   AND NOT EXISTS (
       SELECT 1 FROM rs_loss_bordereau lb
        WHERE lb.premium_bordereau_id = pb.id
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 시나리오 데이터 생성 (PL/pgSQL)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_today           date := CURRENT_DATE;
    v_contract        rs_contracts%ROWTYPE;
    v_period_from     date;
    v_period_to       date;
    v_due_date        date;
    v_label           text;
    v_amount          numeric(18,2);
    v_idx             int;
    v_total_idx       int;
    v_schedule_id     uuid;
    v_first_reinsurer uuid;
    v_commission_rate numeric;
    v_status          text;
    v_received_amt    numeric(18,2);
    v_payment_due_days int;
    v_fx_rate         numeric(12,6);
    v_received_date   date;
    v_outbound_date   date;
    v_outbound_amt    numeric(18,2);
    v_period_months   int;
BEGIN
  FOR v_contract IN
      SELECT * FROM rs_contracts WHERE status = 'active' ORDER BY contract_no
  LOOP
    -- 통화/수수료/납기일 기본값
    v_payment_due_days := COALESCE(v_contract.payment_due_days, 15);
    v_commission_rate  := COALESCE(v_contract.ceding_commission_rate, 0.20);
    v_fx_rate          := CASE WHEN v_contract.settlement_currency = 'KRW' THEN 1.0
                               WHEN v_contract.settlement_currency = 'USD' THEN 1380.0
                               ELSE 1.0 END;

    -- 첫 번째 수재사 (출금 대상)
    SELECT cs.reinsurer_id
      INTO v_first_reinsurer
      FROM rs_contract_shares cs
     WHERE cs.contract_id = v_contract.id
       AND (cs.effective_to IS NULL OR cs.effective_to >= v_today)
     ORDER BY cs.order_of_priority NULLS LAST
     LIMIT 1;

    -- 주기 길이(월)
    v_period_months := CASE v_contract.premium_settlement_period
                          WHEN 'quarterly'  THEN 3
                          WHEN 'semiannual' THEN 6
                          WHEN 'annual'     THEN 12
                          ELSE NULL  -- adhoc
                       END;

    -- ──────────────────────────────────────────────────────────────────
    -- adhoc: 단일 스케줄 (계약 전 기간 1회 납입)
    -- ──────────────────────────────────────────────────────────────────
    IF v_contract.premium_settlement_period = 'adhoc' THEN
        v_period_from := v_contract.inception_date;
        v_period_to   := COALESCE(v_contract.expiry_date,
                                  v_contract.inception_date + INTERVAL '1 year');
        v_due_date    := v_period_from + INTERVAL '30 days';
        v_label       := 'AD-' || TO_CHAR(v_period_from, 'YYYY-MM-DD');
        v_amount      := CASE WHEN v_contract.settlement_currency = 'KRW' THEN 320000000
                              ELSE 240000.00 END;
        v_schedule_id := gen_random_uuid();

        INSERT INTO rs_contract_settlement_schedules
            (id, contract_id, schedule_type, period_label, period_from, period_to,
             expected_amount, currency_code, due_date, status, notes)
        VALUES
            (v_schedule_id, v_contract.id, 'premium', v_label,
             v_period_from, v_period_to,
             v_amount, v_contract.settlement_currency, v_due_date,
             CASE WHEN v_due_date < v_today THEN 'closed' ELSE 'in_progress' END,
             '임의재보험 1회 납입 (시나리오 데이터)');

        -- adhoc 은 납기 도래했으면 완납 처리 (시나리오: 일반적으로 선납)
        IF v_due_date <= v_today THEN
            v_received_date := v_due_date - INTERVAL '5 days';
            INSERT INTO rs_premium_receipts
                (schedule_id, contract_id, counterparty_id, direction,
                 received_date, received_amount, received_currency, exchange_rate,
                 bank_reference, receipt_note, match_status)
            VALUES
                (v_schedule_id, v_contract.id, v_contract.cedant_id, 'inbound',
                 v_received_date, v_amount, v_contract.settlement_currency, v_fx_rate,
                 'SWIFT-' || v_contract.contract_no || '-IN',
                 '임의재보험 보험료 전액 수령 (가상 데이터)', 'matched');

            -- 수재사 송금 (수수료 차감)
            IF v_first_reinsurer IS NOT NULL THEN
                v_outbound_amt  := ROUND(v_amount * (1 - v_commission_rate), 2);
                v_outbound_date := v_received_date + INTERVAL '5 days';
                INSERT INTO rs_premium_receipts
                    (schedule_id, contract_id, counterparty_id, direction,
                     received_date, received_amount, received_currency, exchange_rate,
                     bank_reference, receipt_note, match_status)
                VALUES
                    (v_schedule_id, v_contract.id, v_first_reinsurer, 'outbound',
                     v_outbound_date, v_outbound_amt, v_contract.settlement_currency, v_fx_rate,
                     'SWIFT-' || v_contract.contract_no || '-OUT',
                     '수재사 보험료 송금 (수수료 ' || ROUND(v_commission_rate*100,1) || '% 차감)',
                     'matched');
            END IF;
        END IF;

        -- 명세서 1건
        INSERT INTO rs_premium_bordereau
            (contract_id, period_yyyyqn, policy_no, insured_name,
             risk_period_from, risk_period_to,
             sum_insured, original_premium, cession_pct, ceded_premium,
             currency, entry_type, validation_status)
        VALUES
            (v_contract.id, v_label, 'POL-' || SUBSTRING(v_contract.contract_no FROM '....$') || '-001',
             '시나리오 피보험자 (' || v_contract.contract_no || ')',
             v_period_from, v_period_to,
             v_amount * 10, v_amount, 1.0, v_amount,
             v_contract.settlement_currency, 'new', 'valid');

        CONTINUE;  -- 다음 계약으로
    END IF;

    -- ──────────────────────────────────────────────────────────────────
    -- 주기성 (quarterly / semiannual / annual): 기간 반복 생성
    -- ──────────────────────────────────────────────────────────────────
    v_idx := 0;
    v_period_from := v_contract.inception_date;
    v_total_idx := 0;

    WHILE v_period_from <= COALESCE(v_contract.expiry_date,
                                    v_contract.inception_date + INTERVAL '1 year') LOOP
        v_period_to := LEAST(
            (v_period_from + (v_period_months || ' months')::interval - INTERVAL '1 day')::date,
            COALESCE(v_contract.expiry_date,
                     v_contract.inception_date + INTERVAL '1 year')
        );
        v_due_date  := v_period_to + (v_payment_due_days || ' days')::interval;

        -- 라벨: 분기는 YYYYQn, 반기는 YYYYHn, 연간은 YYYY
        v_label := CASE v_contract.premium_settlement_period
                       WHEN 'quarterly'  THEN TO_CHAR(v_period_from, 'YYYY')
                                              || 'Q'
                                              || ((EXTRACT(MONTH FROM v_period_from)::int - 1) / 3 + 1)
                       WHEN 'semiannual' THEN TO_CHAR(v_period_from, 'YYYY')
                                              || 'H'
                                              || CASE WHEN EXTRACT(MONTH FROM v_period_from) <= 6 THEN '1' ELSE '2' END
                       WHEN 'annual'     THEN TO_CHAR(v_period_from, 'YYYY')
                   END;

        -- 예상 금액 (통화 기준 + 주기 보정)
        v_amount := CASE
                      WHEN v_contract.settlement_currency = 'KRW' THEN
                           CASE v_contract.premium_settlement_period
                              WHEN 'quarterly'  THEN 250000000
                              WHEN 'semiannual' THEN 500000000
                              ELSE 1000000000
                           END
                      ELSE
                           CASE v_contract.premium_settlement_period
                              WHEN 'quarterly'  THEN 250000.00
                              WHEN 'semiannual' THEN 500000.00
                              ELSE 1000000.00
                           END
                    END;

        v_schedule_id := gen_random_uuid();

        -- 수령 상태 결정
        --   납기 60일 이상 경과 → 인덱스 패턴(완납/부분/연체) 순환
        --   납기 0~60일 경과 → 부분 수령 (촉박)
        --   납기 미도래        → 예정 (수령 없음)
        IF v_due_date < v_today - INTERVAL '60 days' THEN
            v_status := CASE (v_idx % 3)
                          WHEN 0 THEN 'fully_received'
                          WHEN 1 THEN 'partial'
                          ELSE        'overdue'
                        END;
        ELSIF v_due_date < v_today THEN
            v_status := 'partial';   -- 최근 연체는 부분수령으로
        ELSE
            v_status := 'pending';
        END IF;

        INSERT INTO rs_contract_settlement_schedules
            (id, contract_id, schedule_type, period_label, period_from, period_to,
             expected_amount, currency_code, due_date, status, notes)
        VALUES
            (v_schedule_id, v_contract.id, 'premium', v_label,
             v_period_from, v_period_to,
             v_amount, v_contract.settlement_currency, v_due_date,
             CASE v_status
                 WHEN 'fully_received' THEN 'closed'
                 WHEN 'partial'        THEN 'in_progress'
                 WHEN 'overdue'        THEN 'open'
                 ELSE                       'open'
             END,
             '시나리오 데이터: ' || v_contract.premium_settlement_period
             || ' / ' || v_status);

        -- 수령 내역 생성
        IF v_status = 'fully_received' THEN
            v_received_date := v_due_date - INTERVAL '3 days';
            INSERT INTO rs_premium_receipts
                (schedule_id, contract_id, counterparty_id, direction,
                 received_date, received_amount, received_currency, exchange_rate,
                 bank_reference, receipt_note, match_status)
            VALUES
                (v_schedule_id, v_contract.id, v_contract.cedant_id, 'inbound',
                 v_received_date, v_amount, v_contract.settlement_currency, v_fx_rate,
                 'SWIFT-' || v_contract.contract_no || '-' || v_label || '-IN',
                 v_label || ' 보험료 전액 수령 (시나리오)', 'matched');

            -- 수재사 송금
            IF v_first_reinsurer IS NOT NULL THEN
                v_outbound_amt  := ROUND(v_amount * (1 - v_commission_rate), 2);
                v_outbound_date := v_received_date + INTERVAL '5 days';
                INSERT INTO rs_premium_receipts
                    (schedule_id, contract_id, counterparty_id, direction,
                     received_date, received_amount, received_currency, exchange_rate,
                     bank_reference, receipt_note, match_status)
                VALUES
                    (v_schedule_id, v_contract.id, v_first_reinsurer, 'outbound',
                     v_outbound_date, v_outbound_amt, v_contract.settlement_currency, v_fx_rate,
                     'SWIFT-' || v_contract.contract_no || '-' || v_label || '-OUT',
                     v_label || ' 수재사 송금 (수수료 '
                     || ROUND(v_commission_rate*100,1) || '% 차감)',
                     'matched');
            END IF;

        ELSIF v_status = 'partial' THEN
            v_received_amt := ROUND(v_amount * 0.6, 2);
            v_received_date := LEAST(v_due_date - INTERVAL '2 days', v_today)::date;
            INSERT INTO rs_premium_receipts
                (schedule_id, contract_id, counterparty_id, direction,
                 received_date, received_amount, received_currency, exchange_rate,
                 bank_reference, receipt_note, match_status)
            VALUES
                (v_schedule_id, v_contract.id, v_contract.cedant_id, 'inbound',
                 v_received_date, v_received_amt, v_contract.settlement_currency, v_fx_rate,
                 'SWIFT-' || v_contract.contract_no || '-' || v_label || '-PARTIAL',
                 v_label || ' 보험료 60% 부분 수령. 잔액 미수령', 'partial');
        END IF;
        -- 'overdue' 와 'pending' 은 수령 내역 없음

        -- 명세서 (보험료 라인 1건)
        INSERT INTO rs_premium_bordereau
            (contract_id, period_yyyyqn, policy_no, insured_name,
             risk_period_from, risk_period_to,
             sum_insured, original_premium, cession_pct, ceded_premium,
             currency, entry_type, validation_status)
        VALUES
            (v_contract.id, v_label,
             'POL-' || SUBSTRING(v_contract.contract_no FROM '....$') || '-' || LPAD((v_idx+1)::text, 3, '0'),
             '시나리오 피보험자 ' || (v_idx+1) || ' (' || v_contract.contract_no || ')',
             v_period_from, v_period_to,
             v_amount * 10, v_amount, 1.0, v_amount,
             v_contract.settlement_currency, 'new', 'valid');

        v_idx := v_idx + 1;
        v_period_from := (v_period_from + (v_period_months || ' months')::interval)::date;
    END LOOP;

    v_total_idx := v_idx;
    RAISE NOTICE '✓ % (%): % 개 기간 생성', v_contract.contract_no,
                 v_contract.premium_settlement_period, v_total_idx;
  END LOOP;
END $$;

-- =============================================================================
-- 3. 결과 요약
-- =============================================================================
DO $$
DECLARE
  v_sched_count    int;
  v_receipt_count  int;
  v_inbound_total  int;
  v_outbound_total int;
  v_overdue_count  int;
  v_pending_count  int;
  v_paid_count     int;
  v_bord_count     int;
BEGIN
  SELECT COUNT(*) INTO v_sched_count
    FROM rs_contract_settlement_schedules WHERE schedule_type = 'premium';
  SELECT COUNT(*) INTO v_receipt_count   FROM rs_premium_receipts;
  SELECT COUNT(*) INTO v_inbound_total   FROM rs_premium_receipts WHERE direction = 'inbound';
  SELECT COUNT(*) INTO v_outbound_total  FROM rs_premium_receipts WHERE direction = 'outbound';
  SELECT COUNT(*) INTO v_overdue_count
    FROM rs_v_schedule_receipt_summary
   WHERE schedule_type = 'premium' AND receipt_status LIKE 'overdue%';
  SELECT COUNT(*) INTO v_pending_count
    FROM rs_v_schedule_receipt_summary
   WHERE schedule_type = 'premium' AND receipt_status = 'pending';
  SELECT COUNT(*) INTO v_paid_count
    FROM rs_v_schedule_receipt_summary
   WHERE schedule_type = 'premium' AND receipt_status = 'fully_received';
  SELECT COUNT(*) INTO v_bord_count
    FROM rs_premium_bordereau WHERE transaction_id IS NULL;

  RAISE NOTICE '──────────────────────────────────────────────';
  RAISE NOTICE '✅ step13_scenario_data 적용 완료';
  RAISE NOTICE '   premium 스케줄  : % 건', v_sched_count;
  RAISE NOTICE '   수령 내역(전체) : % 건 (입금 % / 출금 %)',
               v_receipt_count, v_inbound_total, v_outbound_total;
  RAISE NOTICE '   - 완납           : % 건', v_paid_count;
  RAISE NOTICE '   - 연체           : % 건', v_overdue_count;
  RAISE NOTICE '   - 수령대기(예정) : % 건', v_pending_count;
  RAISE NOTICE '   premium 명세서   : % 건', v_bord_count;
  RAISE NOTICE '──────────────────────────────────────────────';
END $$;

NOTIFY pgrst, 'reload schema';
