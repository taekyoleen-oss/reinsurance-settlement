-- =============================================================================
-- step4_demo_data.sql
-- 재보험 정청산 관리 시스템 — 데모/예시 데이터
-- 목적: 처음 사용자가 시스템 전체 워크플로우를 이해할 수 있도록 현실적 예시 제공
-- 전제: step1~3 실행 완료 후 실행
-- 멱등성: INSERT ... ON CONFLICT DO NOTHING + UPDATE (idempotent)
-- =============================================================================

-- =============================================================================
-- 1. 추가 거래상대방 (Counterparties)
-- =============================================================================
-- Hannover Re Korea — 수재사
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'CP-HANNRE-001', '하노버재보험 한국지점', 'Hannover Re Korea Branch',
    'reinsurer', 'DE', 'EUR', true
) ON CONFLICT (company_code) DO NOTHING;

-- Samsung Fire & Marine Insurance — 출재사
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'CP-SFMI-001', '삼성화재해상보험(주)', 'Samsung Fire & Marine Insurance Co., Ltd.',
    'cedant', 'KR', 'KRW', true
) ON CONFLICT (company_code) DO NOTHING;

-- DB Insurance — 출재사
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES (
    'a1b2c3d4-0006-0006-0006-000000000006',
    'CP-DBI-001', 'DB손해보험(주)', 'DB Insurance Co., Ltd.',
    'cedant', 'KR', 'KRW', true
) ON CONFLICT (company_code) DO NOTHING;

-- =============================================================================
-- 2. 추가 계약 (Contracts)
-- =============================================================================
-- TRT-2025-002: Treaty 비비례재보험 — 해상보험 (삼성화재, Munich Re 70% + Hannover Re 30%)
INSERT INTO rs_contracts
    (id, contract_no, contract_type, treaty_type, class_of_business,
     cedant_id, inception_date, expiry_date,
     settlement_currency, settlement_period, status, description)
VALUES (
    'c0c0c0c0-2222-2222-2222-000000000002',
    'TRT-2025-002', 'treaty', 'non_proportional', 'marine',
    'a1b2c3d4-0005-0005-0005-000000000005',
    '2025-01-01', '2025-12-31', 'USD', 'annual', 'active',
    '2025년도 해상보험 비비례재보험 Treaty. Munich Re 70% + Hannover Re 30%. XL 조건: 손해율 80% 초과분.'
) ON CONFLICT (contract_no) DO NOTHING;

-- FAC-2025-001: Facultative — 엔지니어링보험 (한국화재, Munich Re 100%)
INSERT INTO rs_contracts
    (id, contract_no, contract_type, treaty_type, class_of_business,
     cedant_id, inception_date, expiry_date,
     settlement_currency, settlement_period, status, description)
VALUES (
    'c0c0c0c0-3333-3333-3333-000000000003',
    'FAC-2025-001', 'facultative', NULL, 'engineering',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '2025-03-01', '2026-02-28', 'USD', 'adhoc', 'active',
    '인천 석유화학 플랜트 엔지니어링보험 임의재보험. 원보험사: 한국화재보험. Munich Re 100% 인수.'
) ON CONFLICT (contract_no) DO NOTHING;

-- TRT-2025-003: Treaty 비례재보험 — 배상책임 (DB손해보험, Swiss Re 50% + Hannover Re 50%)
INSERT INTO rs_contracts
    (id, contract_no, contract_type, treaty_type, class_of_business,
     cedant_id, inception_date, expiry_date,
     settlement_currency, settlement_period, status, description)
VALUES (
    'c0c0c0c0-4444-4444-4444-000000000004',
    'TRT-2025-003', 'treaty', 'proportional', 'liability',
    'a1b2c3d4-0006-0006-0006-000000000006',
    '2025-07-01', '2026-06-30', 'USD', 'semiannual', 'active',
    '2025/26년도 배상책임보험 비례재보험 Treaty. Swiss Re 50% + Hannover Re 50%.'
) ON CONFLICT (contract_no) DO NOTHING;

-- =============================================================================
-- 3. 추가 계약 지분율 (Contract Shares)
-- =============================================================================
-- TRT-2025-002: Munich Re 70% (1순위)
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES (
    'd0d0d0d0-4444-4444-4444-000000000003',
    'c0c0c0c0-2222-2222-2222-000000000002',
    'a1b2c3d4-0002-0002-0002-000000000002',
    70.000, 1, '2025-01-01', NULL
) ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- TRT-2025-002: Hannover Re 30%
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES (
    'd0d0d0d0-5555-5555-5555-000000000004',
    'c0c0c0c0-2222-2222-2222-000000000002',
    'a1b2c3d4-0004-0004-0004-000000000004',
    30.000, 2, '2025-01-01', NULL
) ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- TRT-2025-003: Swiss Re 50% (1순위)
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES (
    'd0d0d0d0-6666-6666-6666-000000000005',
    'c0c0c0c0-4444-4444-4444-000000000004',
    'a1b2c3d4-0003-0003-0003-000000000003',
    50.000, 1, '2025-07-01', NULL
) ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- TRT-2025-003: Hannover Re 50%
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES (
    'd0d0d0d0-7777-7777-7777-000000000006',
    'c0c0c0c0-4444-4444-4444-000000000004',
    'a1b2c3d4-0004-0004-0004-000000000004',
    50.000, 2, '2025-07-01', NULL
) ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- =============================================================================
-- 4. 추가 환율 데이터 (분기별)
-- =============================================================================
INSERT INTO rs_exchange_rates
    (from_currency, to_currency, rate, rate_date, rate_type, source, notes)
VALUES
    ('USD','KRW',1378.500000,'2025-03-31','custom','사내기준','2025년 1분기말 USD/KRW'),
    ('EUR','KRW',1491.200000,'2025-03-31','custom','사내기준','2025년 1분기말 EUR/KRW'),
    ('GBP','KRW',1742.800000,'2025-03-31','custom','사내기준','2025년 1분기말 GBP/KRW'),
    ('JPY','KRW',    9.150000,'2025-03-31','custom','사내기준','2025년 1분기말 JPY/KRW'),
    ('USD','KRW',1362.300000,'2025-06-30','custom','사내기준','2025년 2분기말 USD/KRW'),
    ('EUR','KRW',1478.500000,'2025-06-30','custom','사내기준','2025년 2분기말 EUR/KRW'),
    ('GBP','KRW',1728.600000,'2025-06-30','custom','사내기준','2025년 2분기말 GBP/KRW'),
    ('JPY','KRW',    9.020000,'2025-06-30','custom','사내기준','2025년 2분기말 JPY/KRW'),
    ('USD','KRW',1345.800000,'2025-09-30','custom','사내기준','2025년 3분기말 USD/KRW'),
    ('EUR','KRW',1462.100000,'2025-09-30','custom','사내기준','2025년 3분기말 EUR/KRW'),
    ('USD','KRW',1388.000000,'2025-12-31','custom','사내기준','2025년 4분기말 USD/KRW'),
    ('EUR','KRW',1502.500000,'2025-12-31','custom','사내기준','2025년 4분기말 EUR/KRW')
ON CONFLICT (from_currency, rate_date, rate_type) DO NOTHING;

-- =============================================================================
-- 5. 거래 데이터 (Transactions)
-- =============================================================================
-- ── TRT-2025-001 1분기 (2025-01-01 ~ 2025-03-31) ─────────────────────────────
-- [Parent TX - 출재사 원거래, is_allocation_parent=true, Outstanding 계산 제외]

INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
-- 1Q Parent: 보험료 (출재사 원거래)
(
    'e1000001-0000-0000-0000-000000000001', 'TXN-2025-00001',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    500000.00, 'USD', 1378.500000, 689250000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 출재 보험료 원거래 (Munich Re 60% + Swiss Re 40%)',
    'confirmed', true, false
),
-- 1Q Parent: 보험금 (출재사 원거래)
(
    'e1000002-0000-0000-0000-000000000002', 'TXN-2025-00002',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    120000.00, 'USD', 1378.500000, 165420000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 보험금 지급 원거래 (사고: 부산 창고 화재 2025-02-15)',
    'confirmed', true, false
),
-- 1Q Parent: 수수료 (출재사 원거래)
(
    'e1000003-0000-0000-0000-000000000003', 'TXN-2025-00003',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    75000.00, 'USD', 1378.500000, 103387500.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 출재수수료 원거래 (보험료의 15%)',
    'confirmed', true, false
),
-- 1Q Munich Re 60%: 보험료
(
    'e1000011-0000-0000-0000-000000000011', 'TXN-2025-00004',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    300000.00, 'USD', 1378.500000, 413550000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 보험료 — Munich Re 60% (USD 500,000 × 60%)',
    'settled', false, true
),
-- 1Q Munich Re 60%: 보험금
(
    'e1000012-0000-0000-0000-000000000012', 'TXN-2025-00005',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    72000.00, 'USD', 1378.500000, 99252000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 보험금 — Munich Re 60% (USD 120,000 × 60%)',
    'settled', false, true
),
-- 1Q Munich Re 60%: 수수료
(
    'e1000013-0000-0000-0000-000000000013', 'TXN-2025-00006',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    45000.00, 'USD', 1378.500000, 62032500.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 출재수수료 — Munich Re 60% (USD 75,000 × 60%)',
    'settled', false, true
),
-- 1Q Swiss Re 40%: 보험료
(
    'e1000021-0000-0000-0000-000000000021', 'TXN-2025-00007',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    200000.00, 'USD', 1378.500000, 275700000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 보험료 — Swiss Re 40% (USD 500,000 × 40%)',
    'billed', false, true
),
-- 1Q Swiss Re 40%: 보험금
(
    'e1000022-0000-0000-0000-000000000022', 'TXN-2025-00008',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    48000.00, 'USD', 1378.500000, 66168000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 보험금 — Swiss Re 40% (USD 120,000 × 40%)',
    'billed', false, true
),
-- 1Q Swiss Re 40%: 수수료
(
    'e1000023-0000-0000-0000-000000000023', 'TXN-2025-00009',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    30000.00, 'USD', 1378.500000, 41355000.00,
    '2025-04-05', '2025-01-01', '2025-03-31',
    '[1Q] 화재보험 Treaty 출재수수료 — Swiss Re 40% (USD 75,000 × 40%)',
    'billed', false, true
)
ON CONFLICT (transaction_no) DO NOTHING;

-- ── TRT-2025-001 2분기 (2025-04-01 ~ 2025-06-30) ─────────────────────────────
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
-- 2Q Parent: 보험료
(
    'e2000001-0000-0000-0000-000000000001', 'TXN-2025-00010',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    420000.00, 'USD', 1362.300000, 572166000.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 출재 보험료 원거래',
    'confirmed', true, false
),
-- 2Q Parent: 보험금
(
    'e2000002-0000-0000-0000-000000000002', 'TXN-2025-00011',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    95000.00, 'USD', 1362.300000, 129418500.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 보험금 원거래 (사고: 경기 공장 화재 2025-05-22)',
    'confirmed', true, false
),
-- 2Q Parent: 수수료
(
    'e2000003-0000-0000-0000-000000000003', 'TXN-2025-00012',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    63000.00, 'USD', 1362.300000, 85824900.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 출재수수료 원거래 (보험료의 15%)',
    'confirmed', true, false
),
-- 2Q Munich Re 60%: 보험료
(
    'e2000011-0000-0000-0000-000000000011', 'TXN-2025-00013',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    252000.00, 'USD', 1362.300000, 343299600.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 보험료 — Munich Re 60%',
    'billed', false, true
),
-- 2Q Munich Re 60%: 보험금
(
    'e2000012-0000-0000-0000-000000000012', 'TXN-2025-00014',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    57000.00, 'USD', 1362.300000, 77651100.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 보험금 — Munich Re 60%',
    'billed', false, true
),
-- 2Q Munich Re 60%: 수수료
(
    'e2000013-0000-0000-0000-000000000013', 'TXN-2025-00015',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    37800.00, 'USD', 1362.300000, 51494940.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 출재수수료 — Munich Re 60%',
    'billed', false, true
),
-- 2Q Swiss Re 40%: 보험료
(
    'e2000021-0000-0000-0000-000000000021', 'TXN-2025-00016',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    168000.00, 'USD', 1362.300000, 228866400.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 보험료 — Swiss Re 40%',
    'confirmed', false, false
),
-- 2Q Swiss Re 40%: 보험금
(
    'e2000022-0000-0000-0000-000000000022', 'TXN-2025-00017',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    38000.00, 'USD', 1362.300000, 51767400.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 보험금 — Swiss Re 40%',
    'confirmed', false, false
),
-- 2Q Swiss Re 40%: 수수료
(
    'e2000023-0000-0000-0000-000000000023', 'TXN-2025-00018',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    25200.00, 'USD', 1362.300000, 34329960.00,
    '2025-07-08', '2025-04-01', '2025-06-30',
    '[2Q] 화재보험 Treaty 출재수수료 — Swiss Re 40%',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- ── TRT-2025-001 3분기 확정 거래 (아직 AC 없음) ─────────────────────────────
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
(
    'e3000001-0000-0000-0000-000000000001', 'TXN-2025-00019',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    285000.00, 'USD', 1345.800000, 383553000.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 보험료 — Munich Re 60% (USD 475,000 × 60%)',
    'confirmed', false, false
),
(
    'e3000002-0000-0000-0000-000000000002', 'TXN-2025-00020',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    42000.00, 'USD', 1345.800000, 56523600.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 보험금 — Munich Re 60%',
    'confirmed', false, false
),
(
    'e3000003-0000-0000-0000-000000000003', 'TXN-2025-00021',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    42750.00, 'USD', 1345.800000, 57532950.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 출재수수료 — Munich Re 60%',
    'confirmed', false, false
),
(
    'e3000004-0000-0000-0000-000000000004', 'TXN-2025-00022',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    190000.00, 'USD', 1345.800000, 255702000.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 보험료 — Swiss Re 40% (USD 475,000 × 40%)',
    'confirmed', false, false
),
(
    'e3000005-0000-0000-0000-000000000005', 'TXN-2025-00023',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    28000.00, 'USD', 1345.800000, 37682400.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 보험금 — Swiss Re 40%',
    'confirmed', false, false
),
(
    'e3000006-0000-0000-0000-000000000006', 'TXN-2025-00024',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    28500.00, 'USD', 1345.800000, 38355300.00,
    '2025-10-10', '2025-07-01', '2025-09-30',
    '[3Q] 화재보험 Treaty 출재수수료 — Swiss Re 40%',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- ── TRT-2025-002 (비비례재보험, 수동입력) ─────────────────────────────────────
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
-- Munich Re 70% — XL Premium (비비례: allocation_type='manual')
(
    'e4000001-0000-0000-0000-000000000001', 'TXN-2025-00025',
    'c0c0c0c0-2222-2222-2222-000000000002', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'manual',
    126000.00, 'USD', 1388.000000, 174888000.00,
    '2025-04-15', '2025-01-01', '2025-12-31',
    '[연간] 해상보험 XL Treaty — Munich Re 70% (총 보험료 USD 180,000 × 70%)',
    'confirmed', false, false
),
-- Hannover Re 30% — XL Premium
(
    'e4000002-0000-0000-0000-000000000002', 'TXN-2025-00026',
    'c0c0c0c0-2222-2222-2222-000000000002', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0004-0004-0004-000000000004', 'manual',
    54000.00, 'USD', 1388.000000, 74952000.00,
    '2025-04-15', '2025-01-01', '2025-12-31',
    '[연간] 해상보험 XL Treaty — Hannover Re 30% (총 보험료 USD 180,000 × 30%)',
    'confirmed', false, false
),
-- Munich Re — XL Loss (대형 해상사고: 컨테이너선 충돌 2025-09)
(
    'e4000003-0000-0000-0000-000000000003', 'TXN-2025-00027',
    'c0c0c0c0-2222-2222-2222-000000000002', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'manual',
    385000.00, 'USD', 1345.800000, 518283000.00,
    '2025-10-20', '2025-01-01', '2025-12-31',
    '[XL 손해] 컨테이너선 충돌 보험금 — Munich Re 70% (XL 한도 내)',
    'confirmed', false, false
),
-- Hannover Re — XL Loss
(
    'e4000004-0000-0000-0000-000000000004', 'TXN-2025-00028',
    'c0c0c0c0-2222-2222-2222-000000000002', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0004-0004-0004-000000000004', 'manual',
    165000.00, 'USD', 1345.800000, 221907000.00,
    '2025-10-20', '2025-01-01', '2025-12-31',
    '[XL 손해] 컨테이너선 충돌 보험금 — Hannover Re 30% (XL 한도 내)',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- ── FAC-2025-001 (임의재보험, Munich Re 100%) ────────────────────────────────
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to, loss_reference,
     description, status, is_allocation_parent, is_locked)
VALUES
-- FAC 보험료
(
    'e5000001-0000-0000-0000-000000000001', 'TXN-2025-00029',
    'c0c0c0c0-3333-3333-3333-000000000003', 'facultative', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', NULL,
    25000.00, 'USD', 1378.500000, 34462500.00,
    '2025-03-15', '2025-03-01', '2026-02-28',
    NULL,
    '[FAC] 인천 석유화학 플랜트 엔지니어링보험 — Munich Re 100% 보험료',
    'confirmed', false, false
),
-- FAC 반환보험료 (보험가액 조정 Endorsement)
(
    'e5000002-0000-0000-0000-000000000002', 'TXN-2025-00030',
    'c0c0c0c0-3333-3333-3333-000000000003', 'facultative', 'return_premium', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', NULL,
    3500.00, 'USD', 1362.300000, 4768050.00,
    '2025-06-20', '2025-03-01', '2026-02-28',
    NULL,
    '[FAC] Endorsement — 보험가액 하향조정에 따른 반환보험료 (Munich Re 100%)',
    'confirmed', false, false
),
-- FAC 보험금 (조정보험료 예치금 이자)
(
    'e5000003-0000-0000-0000-000000000003', 'TXN-2025-00031',
    'c0c0c0c0-3333-3333-3333-000000000003', 'facultative', 'interest', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', NULL,
    850.00, 'USD', 1362.300000, 1157955.00,
    '2025-09-15', '2025-03-01', '2026-02-28',
    NULL,
    '[FAC] 예치보험료 이자 (Munich Re 100%)',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- ── TRT-2025-003 (배상책임, 하반기 시작) ─────────────────────────────────────
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
(
    'e6000001-0000-0000-0000-000000000001', 'TXN-2025-00032',
    'c0c0c0c0-4444-4444-4444-000000000004', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    92000.00, 'USD', 1345.800000, 123813600.00,
    '2025-10-01', '2025-07-01', '2025-12-31',
    '[하반기] 배상책임 Treaty 보험료 — Swiss Re 50%',
    'draft', false, false
),
(
    'e6000002-0000-0000-0000-000000000002', 'TXN-2025-00033',
    'c0c0c0c0-4444-4444-4444-000000000004', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0004-0004-0004-000000000004', 'auto',
    92000.00, 'USD', 1345.800000, 123813600.00,
    '2025-10-01', '2025-07-01', '2025-12-31',
    '[하반기] 배상책임 Treaty 보험료 — Hannover Re 50%',
    'draft', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- =============================================================================
-- 6. 정산서 (Account Currents)
-- =============================================================================
-- AC-2025-00001: TRT-2025-001 1Q — Munich Re (acknowledged, 완전 정산 완료)
-- net = 300,000 - 72,000 - 45,000 = 183,000 (to_reinsurer: Munich Re가 지급)
INSERT INTO rs_account_currents
    (id, ac_no, contract_id, counterparty_id, direction,
     period_type, period_from, period_to, currency_code,
     balance_bf, subtotal_premium, subtotal_loss, subtotal_commission, subtotal_other, net_balance,
     status, due_date, notes,
     approved_at, issued_at)
VALUES (
    'f0000001-0000-0000-0000-000000000001', 'AC-2025-00001',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'to_reinsurer', 'quarterly', '2025-01-01', '2025-03-31', 'USD',
    0.00, 300000.00, -72000.00, -45000.00, 0.00, 183000.00,
    'acknowledged', '2025-05-15',
    '1Q 화재보험 Treaty 정산서 (Munich Re 60%). 보험료 USD 300,000 - 보험금 USD 72,000 - 수수료 USD 45,000 = 순액 USD 183,000.',
    '2025-04-15 09:30:00+09', '2025-04-16 14:00:00+09'
) ON CONFLICT (ac_no) DO NOTHING;

-- AC-2025-00002: TRT-2025-001 1Q — Swiss Re (issued, 부분 정산)
-- net = 200,000 - 48,000 - 30,000 = 122,000
INSERT INTO rs_account_currents
    (id, ac_no, contract_id, counterparty_id, direction,
     period_type, period_from, period_to, currency_code,
     balance_bf, subtotal_premium, subtotal_loss, subtotal_commission, subtotal_other, net_balance,
     status, due_date, notes,
     approved_at, issued_at)
VALUES (
    'f0000002-0000-0000-0000-000000000002', 'AC-2025-00002',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'to_reinsurer', 'quarterly', '2025-01-01', '2025-03-31', 'USD',
    0.00, 200000.00, -48000.00, -30000.00, 0.00, 122000.00,
    'issued', '2025-05-20',
    '1Q 화재보험 Treaty 정산서 (Swiss Re 40%). USD 100,000 부분 입금 — 잔액 USD 22,000 미수.',
    '2025-04-18 10:15:00+09', '2025-04-21 11:00:00+09'
) ON CONFLICT (ac_no) DO NOTHING;

-- AC-2025-00003: TRT-2025-001 2Q — Munich Re (pending_approval)
-- net = 252,000 - 57,000 - 37,800 = 157,200
INSERT INTO rs_account_currents
    (id, ac_no, contract_id, counterparty_id, direction,
     period_type, period_from, period_to, currency_code,
     balance_bf, subtotal_premium, subtotal_loss, subtotal_commission, subtotal_other, net_balance,
     status, due_date, notes)
VALUES (
    'f0000003-0000-0000-0000-000000000003', 'AC-2025-00003',
    'c0c0c0c0-1111-1111-1111-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'to_reinsurer', 'quarterly', '2025-04-01', '2025-06-30', 'USD',
    0.00, 252000.00, -57000.00, -37800.00, 0.00, 157200.00,
    'pending_approval', '2025-08-20',
    '2Q 화재보험 Treaty 정산서 (Munich Re 60%). 팀장 승인 대기 중.'
) ON CONFLICT (ac_no) DO NOTHING;

-- AC-2025-00004: FAC-2025-001 — Munich Re (draft)
-- net = 25,000 - 3,500 + 850 = 22,350 (to_reinsurer: Munich Re가 순액 수취)
INSERT INTO rs_account_currents
    (id, ac_no, contract_id, counterparty_id, direction,
     period_type, period_from, period_to, currency_code,
     balance_bf, subtotal_premium, subtotal_loss, subtotal_commission, subtotal_other, net_balance,
     status, due_date, notes)
VALUES (
    'f0000004-0000-0000-0000-000000000004', 'AC-2025-00004',
    'c0c0c0c0-3333-3333-3333-000000000003',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'to_reinsurer', 'adhoc', '2025-03-01', '2025-09-30', 'USD',
    0.00, 21500.00, 0.00, 0.00, 850.00, 22350.00,
    'draft', NULL,
    '[FAC] 인천 석유화학 플랜트 임의재보험 정산서 초안. 보험료 USD 25,000 - 반환보험료 USD 3,500 + 이자 USD 850.'
) ON CONFLICT (ac_no) DO NOTHING;

-- =============================================================================
-- 7. 거래 → 정산서 연결 및 상태 업데이트
-- =============================================================================
-- 1Q Munich Re 거래: AC-2025-00001에 연결 (settled, locked)
UPDATE rs_transactions SET
    account_current_id = 'f0000001-0000-0000-0000-000000000001',
    status = 'settled', is_locked = true
WHERE id IN (
    'e1000011-0000-0000-0000-000000000011',  -- 1Q Munich premium
    'e1000012-0000-0000-0000-000000000012',  -- 1Q Munich loss
    'e1000013-0000-0000-0000-000000000013'   -- 1Q Munich commission
) AND status IN ('settled', 'billed');  -- 이미 settled이면 유지

-- 1Q Swiss Re 거래: AC-2025-00002에 연결 (billed, locked)
UPDATE rs_transactions SET
    account_current_id = 'f0000002-0000-0000-0000-000000000002',
    status = 'billed', is_locked = true
WHERE id IN (
    'e1000021-0000-0000-0000-000000000021',  -- 1Q Swiss premium
    'e1000022-0000-0000-0000-000000000022',  -- 1Q Swiss loss
    'e1000023-0000-0000-0000-000000000023'   -- 1Q Swiss commission
);

-- 2Q Munich Re 거래: AC-2025-00003에 연결 (billed, locked)
UPDATE rs_transactions SET
    account_current_id = 'f0000003-0000-0000-0000-000000000003',
    status = 'billed', is_locked = true
WHERE id IN (
    'e2000011-0000-0000-0000-000000000011',  -- 2Q Munich premium
    'e2000012-0000-0000-0000-000000000012',  -- 2Q Munich loss
    'e2000013-0000-0000-0000-000000000013'   -- 2Q Munich commission
);

-- FAC 거래: AC-2025-00004에 연결 (draft AC이므로 confirmed 유지)
UPDATE rs_transactions SET
    account_current_id = 'f0000004-0000-0000-0000-000000000004'
WHERE id IN (
    'e5000001-0000-0000-0000-000000000001',
    'e5000002-0000-0000-0000-000000000002',
    'e5000003-0000-0000-0000-000000000003'
);

-- =============================================================================
-- 8. 정산서 스냅샷 항목 (Account Current Items — issued/acknowledged AC만)
-- =============================================================================
-- AC-2025-00001 (Munich Re Q1, acknowledged)
INSERT INTO rs_account_current_items
    (ac_id, tx_id, transaction_type, description,
     amount_original, currency_code, exchange_rate, amount_settlement_currency,
     direction, snapshot_date)
VALUES
(
    'f0000001-0000-0000-0000-000000000001',
    'e1000011-0000-0000-0000-000000000011',
    'premium', '[1Q] 화재보험 Treaty 보험료 — Munich Re 60%',
    300000.00, 'USD', 1.000000, 300000.00, 'receivable', '2025-04-16 14:00:00+09'
),
(
    'f0000001-0000-0000-0000-000000000001',
    'e1000012-0000-0000-0000-000000000012',
    'loss', '[1Q] 화재보험 Treaty 보험금 — Munich Re 60%',
    72000.00, 'USD', 1.000000, 72000.00, 'payable', '2025-04-16 14:00:00+09'
),
(
    'f0000001-0000-0000-0000-000000000001',
    'e1000013-0000-0000-0000-000000000013',
    'commission', '[1Q] 화재보험 Treaty 출재수수료 — Munich Re 60%',
    45000.00, 'USD', 1.000000, 45000.00, 'payable', '2025-04-16 14:00:00+09'
)
ON CONFLICT (ac_id, tx_id) DO NOTHING;

-- AC-2025-00002 (Swiss Re Q1, issued)
INSERT INTO rs_account_current_items
    (ac_id, tx_id, transaction_type, description,
     amount_original, currency_code, exchange_rate, amount_settlement_currency,
     direction, snapshot_date)
VALUES
(
    'f0000002-0000-0000-0000-000000000002',
    'e1000021-0000-0000-0000-000000000021',
    'premium', '[1Q] 화재보험 Treaty 보험료 — Swiss Re 40%',
    200000.00, 'USD', 1.000000, 200000.00, 'receivable', '2025-04-21 11:00:00+09'
),
(
    'f0000002-0000-0000-0000-000000000002',
    'e1000022-0000-0000-0000-000000000022',
    'loss', '[1Q] 화재보험 Treaty 보험금 — Swiss Re 40%',
    48000.00, 'USD', 1.000000, 48000.00, 'payable', '2025-04-21 11:00:00+09'
),
(
    'f0000002-0000-0000-0000-000000000002',
    'e1000023-0000-0000-0000-000000000023',
    'commission', '[1Q] 화재보험 Treaty 출재수수료 — Swiss Re 40%',
    30000.00, 'USD', 1.000000, 30000.00, 'payable', '2025-04-21 11:00:00+09'
)
ON CONFLICT (ac_id, tx_id) DO NOTHING;

-- =============================================================================
-- 9. 결제 내역 (Settlements)
-- =============================================================================
-- PAY-2025-00001: Munich Re 1Q 정산금 수령 (전액 USD 183,000)
INSERT INTO rs_settlements
    (id, settlement_no, settlement_type, counterparty_id,
     amount, currency_code, exchange_rate, amount_krw,
     settlement_date, bank_reference,
     match_status, matched_amount, notes)
VALUES (
    'b0000001-0000-0000-0000-000000000001', 'PAY-2025-00001',
    'receipt',
    'a1b2c3d4-0002-0002-0002-000000000002',
    183000.00, 'USD', 1378.500000, 252265500.00,
    '2025-05-12', 'SWIFT-MRK-20250512-001',
    'fully_matched', 183000.00,
    'Munich Re 1Q 화재보험 Treaty 정산금 전액 수령. AC-2025-00001 완전 매칭.'
) ON CONFLICT (settlement_no) DO NOTHING;

-- PAY-2025-00002: Swiss Re 1Q 정산금 부분 수령 (USD 100,000 중 일부)
INSERT INTO rs_settlements
    (id, settlement_no, settlement_type, counterparty_id,
     amount, currency_code, exchange_rate, amount_krw,
     settlement_date, bank_reference,
     match_status, matched_amount, notes)
VALUES (
    'b0000002-0000-0000-0000-000000000002', 'PAY-2025-00002',
    'receipt',
    'a1b2c3d4-0003-0003-0003-000000000003',
    100000.00, 'USD', 1362.300000, 136230000.00,
    '2025-05-28', 'SWIFT-SRK-20250528-001',
    'partial', 100000.00,
    'Swiss Re 1Q 화재보험 Treaty 정산금 부분 수령. 잔액 USD 22,000 별도 입금 예정.'
) ON CONFLICT (settlement_no) DO NOTHING;

-- PAY-2025-00003: 미매칭 입금 (Swiss Re에서 추가 송금, 아직 AC 확인 중)
INSERT INTO rs_settlements
    (id, settlement_no, settlement_type, counterparty_id,
     amount, currency_code, exchange_rate, amount_krw,
     settlement_date, bank_reference,
     match_status, matched_amount, notes)
VALUES (
    'b0000003-0000-0000-0000-000000000003', 'PAY-2025-00003',
    'receipt',
    'a1b2c3d4-0003-0003-0003-000000000003',
    22000.00, 'USD', 1362.300000, 29970600.00,
    '2025-06-10', 'SWIFT-SRK-20250610-001',
    'unmatched', 0.00,
    'Swiss Re 추가 송금 USD 22,000. AC 매칭 작업 필요.'
) ON CONFLICT (settlement_no) DO NOTHING;

-- =============================================================================
-- 10. 결제 ↔ 정산서 매칭 (Settlement Matches)
-- =============================================================================
-- Munich Re 1Q: 전액 매칭
INSERT INTO rs_settlement_matches
    (id, settlement_id, account_current_id, matched_amount, currency_code, notes)
VALUES (
    'a2000001-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    183000.00, 'USD',
    'Munich Re 1Q 정산서 전액 매칭 완료'
) ON CONFLICT (settlement_id, account_current_id) DO NOTHING;

-- Swiss Re 1Q: 부분 매칭 (USD 100,000)
INSERT INTO rs_settlement_matches
    (id, settlement_id, account_current_id, matched_amount, currency_code, notes)
VALUES (
    'a2000002-0000-0000-0000-000000000002',
    'b0000002-0000-0000-0000-000000000002',
    'f0000002-0000-0000-0000-000000000002',
    100000.00, 'USD',
    'Swiss Re 1Q 정산서 부분 매칭 (USD 100,000). 잔액 USD 22,000 별도 처리 필요.'
) ON CONFLICT (settlement_id, account_current_id) DO NOTHING;

-- =============================================================================
-- 11. 대사 항목 (Reconciliation Items)
-- =============================================================================
-- 대사 항목 1: 일치 (Munich Re 1Q 보험료)
INSERT INTO rs_reconciliation_items
    (id, counterparty_id, contract_id, period_from, period_to,
     transaction_type, tx_id, broker_amount, counterparty_claimed_amount,
     status, notes)
VALUES (
    'a3000001-0000-0000-0000-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'c0c0c0c0-1111-1111-1111-000000000001',
    '2025-01-01', '2025-03-31',
    'premium',
    'e1000011-0000-0000-0000-000000000011',
    300000.00, 300000.00,
    'matched',
    'Munich Re 1Q 보험료 대사 완료. 양측 금액 일치.'
) ON CONFLICT DO NOTHING;

-- 대사 항목 2: 불일치 — Swiss Re 보험금 차이
INSERT INTO rs_reconciliation_items
    (id, counterparty_id, contract_id, period_from, period_to,
     transaction_type, tx_id, broker_amount, counterparty_claimed_amount,
     status, notes)
VALUES (
    'a3000002-0000-0000-0000-000000000002',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'c0c0c0c0-1111-1111-1111-000000000001',
    '2025-01-01', '2025-03-31',
    'loss',
    'e1000022-0000-0000-0000-000000000022',
    48000.00, 51200.00,
    'disputed',
    'Swiss Re 주장 금액(USD 51,200)과 브로커 장부(USD 48,000) 차이 USD 3,200 발생. 원인: 손해사정 보고서 버전 불일치. 확인 중.'
) ON CONFLICT DO NOTHING;

-- 대사 항목 3: 미대사 — Swiss Re 1Q 보험료
INSERT INTO rs_reconciliation_items
    (id, counterparty_id, contract_id, period_from, period_to,
     transaction_type, tx_id, broker_amount, counterparty_claimed_amount,
     status, notes)
VALUES (
    'a3000003-0000-0000-0000-000000000003',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'c0c0c0c0-1111-1111-1111-000000000001',
    '2025-01-01', '2025-03-31',
    'premium',
    'e1000021-0000-0000-0000-000000000021',
    200000.00, NULL,
    'unmatched',
    'Swiss Re 측 보험료 확인서 수령 대기 중. 발행 후 대사 진행 예정.'
) ON CONFLICT DO NOTHING;

-- 대사 항목 4: 불일치 — Munich Re 2Q 보험금
INSERT INTO rs_reconciliation_items
    (id, counterparty_id, contract_id, period_from, period_to,
     transaction_type, tx_id, broker_amount, counterparty_claimed_amount,
     status, notes)
VALUES (
    'a3000004-0000-0000-0000-000000000004',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'c0c0c0c0-1111-1111-1111-000000000001',
    '2025-04-01', '2025-06-30',
    'loss',
    'e2000012-0000-0000-0000-000000000012',
    57000.00, 57000.00,
    'matched',
    'Munich Re 2Q 보험금 대사 완료.'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- 12. due_date 설정 — Aging 버킷 분류용
-- =============================================================================
-- ※ 오늘(기준일) 2026-04-07 기준:
--   Current   : due_date >= 2026-04-07 (미래)
--   1-30일    : due_date 2026-03-08 ~ 2026-04-06
--   31-60일   : due_date 2026-02-06 ~ 2026-03-07
--   61-90일   : due_date 2026-01-07 ~ 2026-02-05
--   90일+     : due_date <= 2026-01-06

-- [Current] 2Q Munich Re — AC pending_approval (미래 만기)
UPDATE rs_transactions SET due_date = '2026-08-20'
WHERE id IN (
    'e2000011-0000-0000-0000-000000000011',
    'e2000012-0000-0000-0000-000000000012',
    'e2000013-0000-0000-0000-000000000013'
);

-- [Current] 2Q Swiss Re — confirmed (미래 만기)
UPDATE rs_transactions SET due_date = '2026-06-30'
WHERE id IN (
    'e2000021-0000-0000-0000-000000000021',
    'e2000022-0000-0000-0000-000000000022',
    'e2000023-0000-0000-0000-000000000023'
);

-- [Current] 3Q Munich Re — confirmed (2026-04-20, 13일 후)
UPDATE rs_transactions SET due_date = '2026-04-20'
WHERE id IN (
    'e3000001-0000-0000-0000-000000000001',
    'e3000002-0000-0000-0000-000000000002',
    'e3000003-0000-0000-0000-000000000003'
);

-- [1-30일 연체] 3Q Swiss Re — 2026-03-31 (7일 연체)
UPDATE rs_transactions SET due_date = '2026-03-31'
WHERE id IN (
    'e3000004-0000-0000-0000-000000000004',
    'e3000005-0000-0000-0000-000000000005',
    'e3000006-0000-0000-0000-000000000006'
);

-- [31-60일 연체] TRT-2025-002 Munich Re 보험금 — 2026-02-28 (38일 연체)
UPDATE rs_transactions SET due_date = '2026-02-28'
WHERE id = 'e4000003-0000-0000-0000-000000000003';

-- [61-90일 연체] TRT-2025-002 Hannover Re 보험금 — 2026-01-20 (77일 연체)
UPDATE rs_transactions SET due_date = '2026-01-20'
WHERE id = 'e4000004-0000-0000-0000-000000000004';

-- [90일+ 연체] TRT-2025-002 보험료 (Munich Re, Hannover Re)
UPDATE rs_transactions SET due_date = '2025-12-15'
WHERE id = 'e4000001-0000-0000-0000-000000000001';  -- Munich Re 126,000 rec, 113일 연체

UPDATE rs_transactions SET due_date = '2025-12-31'
WHERE id = 'e4000002-0000-0000-0000-000000000002';  -- Hannover Re 54,000 rec, 97일 연체

-- [Current] FAC Munich Re — 2026-04-30 (미래)
UPDATE rs_transactions SET due_date = '2026-04-30'
WHERE id IN (
    'e5000001-0000-0000-0000-000000000001',
    'e5000002-0000-0000-0000-000000000002',
    'e5000003-0000-0000-0000-000000000003'
);

-- =============================================================================
-- 13. 4분기 거래 추가 (TRT-2025-001, Oct-Dec 2025) — Aging 버킷 다양화
-- =============================================================================
-- 4Q 총계: 보험료 USD 534,000, 보험금 USD 158,000, 수수료 USD 80,100
-- Munich Re 60%: 보험료 320,400 / 보험금 94,800 / 수수료 48,060
-- Swiss Re 40%:  보험료 213,600 / 보험금 63,200 / 수수료 32,040

-- [Parent TX — Outstanding 계산 제외]
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, due_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
(
    'e7000001-0000-0000-0000-000000000001', 'TXN-2025-00034',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    534000.00, 'USD', 1388.000000, 741192000.00,
    '2026-01-08', '2026-04-30', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 출재 보험료 원거래 (Munich Re 60% + Swiss Re 40%)',
    'confirmed', true, false
),
(
    'e7000002-0000-0000-0000-000000000002', 'TXN-2025-00035',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    158000.00, 'USD', 1388.000000, 219304000.00,
    '2026-01-08', '2026-04-30', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 보험금 원거래 (사고: 서울 물류센터 화재 2025-11-03)',
    'confirmed', true, false
),
(
    'e7000003-0000-0000-0000-000000000003', 'TXN-2025-00036',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0001-0001-0001-000000000001', 'auto',
    80100.00, 'USD', 1388.000000, 111178800.00,
    '2026-01-08', '2026-04-30', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 출재수수료 원거래 (보험료의 15%)',
    'confirmed', true, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- [1-30일 연체] Munich Re 60% — 4Q 보험료 (2026-03-15, 23일 연체)
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, due_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES (
    'e7000011-0000-0000-0000-000000000011', 'TXN-2025-00037',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    320400.00, 'USD', 1388.000000, 444715200.00,
    '2026-01-08', '2026-03-15', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 보험료 — Munich Re 60% ⚠ 만기 초과 23일',
    'confirmed', false, false
) ON CONFLICT (transaction_no) DO NOTHING;

-- [31-60일 연체] Munich Re 60% — 4Q 보험금·수수료 (2026-02-15, 51일 연체)
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, due_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
(
    'e7000012-0000-0000-0000-000000000012', 'TXN-2025-00038',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    94800.00, 'USD', 1388.000000, 131582400.00,
    '2026-01-08', '2026-02-15', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 보험금 — Munich Re 60% ⚠ 만기 초과 51일',
    'confirmed', false, false
),
(
    'e7000013-0000-0000-0000-000000000013', 'TXN-2025-00039',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0002-0002-0002-000000000002', 'auto',
    48060.00, 'USD', 1388.000000, 66707280.00,
    '2026-01-08', '2026-02-15', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 출재수수료 — Munich Re 60% ⚠ 만기 초과 51일',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- [61-90일 연체] Swiss Re 40% — 4Q 보험금·수수료 (2026-01-31, 65일 연체)
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, due_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
(
    'e7000022-0000-0000-0000-000000000022', 'TXN-2025-00040',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'loss', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    63200.00, 'USD', 1388.000000, 877216000.00,
    '2026-01-08', '2026-01-31', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 보험금 — Swiss Re 40% ⚠ 만기 초과 65일',
    'confirmed', false, false
),
(
    'e7000023-0000-0000-0000-000000000023', 'TXN-2025-00041',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'commission', 'payable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    32040.00, 'USD', 1388.000000, 44471520.00,
    '2026-01-08', '2026-01-31', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 출재수수료 — Swiss Re 40% ⚠ 만기 초과 65일',
    'confirmed', false, false
)
ON CONFLICT (transaction_no) DO NOTHING;

-- [90일+ 연체] Swiss Re 40% — 4Q 보험료 (2026-01-05, 92일 연체)
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, due_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES (
    'e7000021-0000-0000-0000-000000000021', 'TXN-2025-00042',
    'c0c0c0c0-1111-1111-1111-000000000001', 'treaty', 'premium', 'receivable',
    'a1b2c3d4-0003-0003-0003-000000000003', 'auto',
    213600.00, 'USD', 1388.000000, 296476800.00,
    '2026-01-08', '2026-01-05', '2025-10-01', '2025-12-31',
    '[4Q] 화재보험 Treaty 보험료 — Swiss Re 40% ⚠⚠ 만기 초과 92일',
    'confirmed', false, false
) ON CONFLICT (transaction_no) DO NOTHING;

-- =============================================================================
-- 검증 쿼리
-- =============================================================================
DO $$
DECLARE
    v_tx_count          int;
    v_outstanding_usd   numeric;
    v_aging_90plus      numeric;
    v_ac_count          int;
    v_pay_count         int;
BEGIN
    SELECT COUNT(*) INTO v_tx_count FROM rs_transactions WHERE is_deleted = false;
    SELECT COUNT(*) INTO v_ac_count FROM rs_account_currents;
    SELECT COUNT(*) INTO v_pay_count FROM rs_settlements;

    -- 미청산 잔액: confirmed/billed, is_allocation_parent=false
    SELECT COALESCE(
        SUM(CASE WHEN direction = 'receivable' THEN amount_original ELSE -amount_original END), 0
    ) INTO v_outstanding_usd
    FROM rs_transactions
    WHERE is_deleted = false
      AND is_allocation_parent = false
      AND status IN ('confirmed', 'billed')
      AND currency_code = 'USD';

    -- 90일+ 연체 금액
    SELECT COALESCE(
        SUM(CASE WHEN direction = 'receivable' THEN amount_original ELSE -amount_original END), 0
    ) INTO v_aging_90plus
    FROM rs_transactions
    WHERE is_deleted = false
      AND is_allocation_parent = false
      AND status IN ('confirmed', 'billed')
      AND due_date IS NOT NULL
      AND (CURRENT_DATE - due_date) > 90;

    RAISE NOTICE '=== step4_demo_data.sql 실행 완료 ===';
    RAISE NOTICE 'rs_transactions (전체): % 행', v_tx_count;
    RAISE NOTICE 'rs_account_currents:    % 행', v_ac_count;
    RAISE NOTICE 'rs_settlements:         % 행', v_pay_count;
    RAISE NOTICE '--- 대시보드 검증 ---';
    RAISE NOTICE '미청산 순잔액(USD): %', v_outstanding_usd;
    RAISE NOTICE '90일+ 연체금액(USD): %', v_aging_90plus;
    RAISE NOTICE '';
    RAISE NOTICE '[Aging 버킷 분포 예상]';
    RAISE NOTICE '  Current   : Munich Re 2Q/3Q, Swiss Re 2Q, FAC';
    RAISE NOTICE '  1-30일    : Swiss Re 3Q(due 2026-03-31), Munich Re 4Q 보험료(due 2026-03-15)';
    RAISE NOTICE '  31-60일   : Munich Re 4Q 보험금/수수료(due 2026-02-15), TRT-002 Munich 보험금(due 2026-02-28)';
    RAISE NOTICE '  61-90일   : Hannover Re TRT-002 보험금(due 2026-01-20), Swiss Re 4Q 보험금(due 2026-01-31)';
    RAISE NOTICE '  90일+     : Swiss Re 4Q 보험료(due 2026-01-05), TRT-002 보험료(due 2025-12)';
END $$;
