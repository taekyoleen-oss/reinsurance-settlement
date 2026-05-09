-- =============================================================================
-- step9_premium_schedule_data.sql
-- 보험료 정산 스케줄 샘플 데이터 — Premium Schedule & Receipt Sample Data
-- 전제: step5_v15_enhancements.sql + step8_premium_receipts.sql 적용 완료
-- 멱등성: ON CONFLICT DO NOTHING / DO UPDATE
-- =============================================================================
-- 대상 계약:
--   TRT-2025-001 (분기별, USD, 한국화재): Q1 완납 / Q2 부분수령(연체) / Q3·Q4 미수령(연체)
--   TRT-2025-002 (연간, USD, 삼성화재): 연간 미수령(연체)
--   TRT-2025-003 (반기별, USD, DB손해보험): H1 완납 / H2 진행중(기한 미도래)
-- =============================================================================

-- =============================================================================
-- 0. premium_settlement_period 명시 업데이트 (step5에서 settlement_period 복사됨,
--    이 SQL은 명세를 명확히 하기 위해 재확인 UPDATE 포함)
-- =============================================================================
UPDATE rs_contracts SET premium_settlement_period = 'quarterly'  WHERE contract_no = 'TRT-2025-001';
UPDATE rs_contracts SET premium_settlement_period = 'annual'     WHERE contract_no = 'TRT-2025-002';
UPDATE rs_contracts SET premium_settlement_period = 'semiannual' WHERE contract_no = 'TRT-2025-003';
UPDATE rs_contracts SET premium_settlement_period = 'adhoc'      WHERE contract_no = 'FAC-2025-001';

-- =============================================================================
-- 1. rs_contract_settlement_schedules — 보험료 정산 스케줄
-- =============================================================================

-- ── TRT-2025-001 (분기별) ─────────────────────────────────────────────────────
-- Q1: 2025-01-01 ~ 2025-03-31  납기 2025-04-15  예상 500,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000011-0000-0000-0000-000000000001',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'premium', '2025Q1', '2025-01-01', '2025-03-31',
    500000.00, 'USD', '2025-04-15', 'closed',
    '1분기 화재보험 Treaty 보험료. 납기 2025-04-15.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- Q2: 2025-04-01 ~ 2025-06-30  납기 2025-07-15  예상 480,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000011-0000-0000-0000-000000000002',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'premium', '2025Q2', '2025-04-01', '2025-06-30',
    480000.00, 'USD', '2025-07-15', 'in_progress',
    '2분기 화재보험 Treaty 보험료. 300,000 USD 부분 수령, 180,000 USD 잔액.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- Q3: 2025-07-01 ~ 2025-09-30  납기 2025-10-15  예상 460,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000011-0000-0000-0000-000000000003',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'premium', '2025Q3', '2025-07-01', '2025-09-30',
    460000.00, 'USD', '2025-10-15', 'open',
    '3분기 화재보험 Treaty 보험료. 납기 경과 미수령 상태.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- Q4: 2025-10-01 ~ 2025-12-31  납기 2026-01-15  예상 450,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000011-0000-0000-0000-000000000004',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'premium', '2025Q4', '2025-10-01', '2025-12-31',
    450000.00, 'USD', '2026-01-15', 'open',
    '4분기 화재보험 Treaty 보험료. 납기 경과 미수령 상태.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- ── TRT-2025-002 (연간, 비비례재보험) ────────────────────────────────────────
-- Annual: 2025-01-01 ~ 2025-12-31  납기 2026-01-31  예상 1,200,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000022-0000-0000-0000-000000000001',
    'c0c0c0c0-2222-2222-2222-000000000002',
    'premium', '2025', '2025-01-01', '2025-12-31',
    1200000.00, 'USD', '2026-01-31', 'open',
    '2025년도 해상보험 XL Treaty 연간 보험료. 납기 경과 미수령.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- ── TRT-2025-003 (반기별) ─────────────────────────────────────────────────────
-- H1: 2025-07-01 ~ 2025-12-31  납기 2026-01-31  예상 600,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000033-0000-0000-0000-000000000001',
    'c0c0c0c0-4444-4444-4444-000000000004',
    'premium', '2025H2', '2025-07-01', '2025-12-31',
    600000.00, 'USD', '2026-01-31', 'closed',
    '2025년도 하반기 배상책임 Treaty 보험료. 완납 처리.'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- H2: 2026-01-01 ~ 2026-06-30  납기 2026-07-31  예상 620,000 USD
INSERT INTO rs_contract_settlement_schedules
    (id, contract_id, schedule_type, period_label, period_from, period_to,
     expected_amount, currency_code, due_date, status, notes)
VALUES (
    '00000033-0000-0000-0000-000000000002',
    'c0c0c0c0-4444-4444-4444-000000000004',
    'premium', '2026H1', '2026-01-01', '2026-06-30',
    620000.00, 'USD', '2026-07-31', 'open',
    '2026년도 상반기 배상책임 Treaty 보험료. 납기 2026-07-31 (미도래).'
) ON CONFLICT (contract_id, schedule_type, period_label) DO UPDATE
    SET expected_amount = EXCLUDED.expected_amount,
        due_date        = EXCLUDED.due_date,
        status          = EXCLUDED.status,
        notes           = EXCLUDED.notes;

-- =============================================================================
-- 2. rs_premium_receipts — 실제 수령 내역
-- =============================================================================

-- ── TRT-2025-001 Q1: 완납 (500,000 USD) ──────────────────────────────────────
INSERT INTO rs_premium_receipts
    (id, schedule_id, contract_id, counterparty_id,
     direction, received_date, received_amount, received_currency, exchange_rate,
     bank_reference, receipt_note, match_status)
VALUES (
    'aa000001-0000-0000-0000-000000000001',
    '00000011-0000-0000-0000-000000000001',   -- Q1 스케줄
    'c0c0c0c0-1111-1111-1111-000000000001',   -- TRT-2025-001
    'a1b2c3d4-0001-0001-0001-000000000001',   -- 한국화재보험(주)
    'inbound', '2025-04-10', 500000.00, 'USD', 1378.500000,
    'SWIFT-2025-HF-001', '1분기 보험료 전액 수령. 한국화재보험 전신환 이체.',
    'matched'
) ON CONFLICT (id) DO NOTHING;

-- ── TRT-2025-001 Q2: 부분 수령 (300,000 USD / 예상 480,000 USD) ──────────────
INSERT INTO rs_premium_receipts
    (id, schedule_id, contract_id, counterparty_id,
     direction, received_date, received_amount, received_currency, exchange_rate,
     bank_reference, receipt_note, match_status)
VALUES (
    'aa000001-0000-0000-0000-000000000002',
    '00000011-0000-0000-0000-000000000002',   -- Q2 스케줄
    'c0c0c0c0-1111-1111-1111-000000000001',   -- TRT-2025-001
    'a1b2c3d4-0001-0001-0001-000000000001',   -- 한국화재보험(주)
    'inbound', '2025-07-20', 300000.00, 'USD', 1362.300000,
    'SWIFT-2025-HF-002', '2분기 보험료 부분 수령 (300,000/480,000 USD). 잔액 180,000 USD 미수령.',
    'partial'
) ON CONFLICT (id) DO NOTHING;

-- ── TRT-2025-003 H1 (2025H2): 완납 (600,000 USD) ─────────────────────────────
INSERT INTO rs_premium_receipts
    (id, schedule_id, contract_id, counterparty_id,
     direction, received_date, received_amount, received_currency, exchange_rate,
     bank_reference, receipt_note, match_status)
VALUES (
    'aa000003-0000-0000-0000-000000000001',
    '00000033-0000-0000-0000-000000000001',   -- 2025H2 스케줄
    'c0c0c0c0-4444-4444-4444-000000000004',   -- TRT-2025-003
    'a1b2c3d4-0006-0006-0006-000000000006',   -- DB손해보험(주)
    'inbound', '2026-02-05', 600000.00, 'USD', 1388.000000,
    'SWIFT-2026-DB-001', '2025년 하반기 배상책임 보험료 전액 수령.',
    'matched'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 완료 메시지
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ step9_premium_schedule_data.sql 적용 완료';
  RAISE NOTICE '   - 정산 스케줄: TRT-2025-001(4개) + TRT-2025-002(1개) + TRT-2025-003(2개)';
  RAISE NOTICE '   - 수령 내역: Q1 완납 / Q2 부분수령 / 2025H2 완납';
  RAISE NOTICE '   - 연체 항목: Q3, Q4 (TRT-2025-001) + 연간 (TRT-2025-002)';
END $$;
