-- =============================================================================
-- step5_demo_kr_cedants_global_reinsurers.sql
-- 국내 손해보험사(출재/cedant) + 글로벌 재보험사(수재/reinsurer) 데모 묶음
-- 계약 3건 + 명세(bordereau) + 거래 + 정산서 + 결제 + 대사 일부
--
-- 전제: step1_schema, step2_rls, step3_seed(통화), step4_bordereau 마이그레이션 적용됨
-- 멱등: counterparties/contract_no/ac_no/tx_no/settlement_no 기준 ON CONFLICT
-- 재실행: 동일 company_code가 이미 다른 id로 존재하면 FK 오류 → 해당 코드 행 정리 후 실행
--
-- 용어: DB 주석과 동일 — cedant=출재사(원보), reinsurer=수재사(재보)
-- =============================================================================

-- 환율 (2026년 1분기 예시)
INSERT INTO rs_exchange_rates (from_currency, to_currency, rate, rate_date, rate_type, source, notes)
VALUES
    ('USD', 'KRW', 1385.000000, '2026-03-31', 'custom', '사내기준', '데모 2026Q1 USD/KRW'),
    ('EUR', 'KRW', 1520.000000, '2026-03-31', 'custom', '사내기준', '데모 2026Q1 EUR/KRW')
ON CONFLICT (from_currency, rate_date, rate_type) DO NOTHING;

-- ── 출재사(국내 손보) ─────────────────────────────────────────────────────
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES
    ('b1000001-1001-4001-8001-000000000001', 'CP-DEMO-KB-2026',
     'KB손해보험(주)', 'KB Insurance Co., Ltd.',
     'cedant', 'KR', 'KRW', true),
    ('b1000001-1001-4001-8001-000000000002', 'CP-DEMO-HDMI-2026',
     '현대해상화재보험(주)', 'Hyundai Marine & Fire Insurance Co., Ltd.',
     'cedant', 'KR', 'KRW', true),
    ('b1000001-1001-4001-8001-000000000003', 'CP-DEMO-MERITZ-2026',
     '메리츠화재보험(주)', 'Meritz Fire & Marine Insurance Co., Ltd.',
     'cedant', 'KR', 'KRW', true)
ON CONFLICT (company_code) DO NOTHING;

-- ── 수재사(Munich Re / Swiss Re / Gen Re) ─────────────────────────────────
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES
    ('b2000002-2002-4002-8002-000000000010', 'CP-DEMO-MUNICHRE-GLOBAL',
     '뮌헨재보험주식회사', 'Munich Reinsurance Company',
     'reinsurer', 'DE', 'EUR', true),
    ('b2000002-2002-4002-8002-000000000011', 'CP-DEMO-SWISSRE-GLOBAL',
     '스위스재보험주식회사', 'Swiss Reinsurance Company Ltd.',
     'reinsurer', 'CH', 'USD', true),
    ('b2000002-2002-4002-8002-000000000012', 'CP-DEMO-GENRE-GLOBAL',
     '제너럴재보험주식회사', 'General Reinsurance AG (Gen Re)',
     'reinsurer', 'DE', 'USD', true)
ON CONFLICT (company_code) DO NOTHING;

-- ── 계약 3건 ───────────────────────────────────────────────────────────────
INSERT INTO rs_contracts
    (id, contract_no, contract_type, treaty_type, class_of_business,
     cedant_id, inception_date, expiry_date,
     settlement_currency, settlement_period, status, description,
     underwriting_basis, ceding_commission_rate, payment_due_days, confirmation_due_days, offset_allowed)
VALUES
    (
        'b3100003-3003-4003-8003-000000000001',
        'TRT-DEMO-2026-FIRE',
        'treaty', 'proportional', 'fire',
        'b1000001-1001-4001-8001-000000000003',
        '2026-01-01', '2026-12-31',
        'USD', 'quarterly', 'active',
        '데모: 메리츠 화재 비례재보 — Munich Re 50% + Gen Re 50%.',
        'UY', 0.2800, 15, 14, false
    ),
    (
        'b3100003-3003-4003-8003-000000000002',
        'TRT-DEMO-2026-MAR-KRW',
        'treaty', 'proportional', 'marine',
        'b1000001-1001-4001-8001-000000000002',
        '2026-01-01', '2026-12-31',
        'KRW', 'semiannual', 'active',
        '데모: 현대해상 해상 비례재보 — Swiss Re 100% (원화정산).',
        'UY', 0.2500, 20, 14, false
    ),
    (
        'b3100003-3003-4003-8003-000000000003',
        'FAC-DEMO-2026-KB-ENG',
        'facultative', NULL, 'engineering',
        'b1000001-1001-4001-8001-000000000001',
        '2026-02-01', '2027-01-31',
        'USD', 'adhoc', 'active',
        '데모: KB손보 건설공사 임의재보 — Gen Re 100%.',
        'UY', 0.1500, 30, 14, false
    )
ON CONFLICT (contract_no) DO NOTHING;

-- 지분 (Treaty 2건)
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES
    ('b4100004-4004-4004-8004-000000000001', 'b3100003-3003-4003-8003-000000000001',
     'b2000002-2002-4002-8002-000000000010', 50.000, 1, '2026-01-01', NULL),
    ('b4100004-4004-4004-8004-000000000002', 'b3100003-3003-4003-8003-000000000001',
     'b2000002-2002-4002-8002-000000000012', 50.000, 2, '2026-01-01', NULL),
    ('b4100004-4004-4004-8004-000000000003', 'b3100003-3003-4003-8003-000000000002',
     'b2000002-2002-4002-8002-000000000011', 100.000, 1, '2026-01-01', NULL)
ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- =============================================================================
-- 거래 (TRT-DEMO-2026-FIRE — 2026Q1, Parent + 수재사 배분)
-- =============================================================================
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
    ('b5100005-5005-4005-8005-000000000001', 'TXN-DEMO-2026-00001',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'premium', 'receivable',
     'b1000001-1001-4001-8001-000000000003', 'auto',
     400000.00, 'USD', 1385.000000, 554000000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] 화재 Treaty 출재보험료 원거래 (Munich 50% + Gen Re 50%)',
     'confirmed', true, false),
    ('b5100005-5005-4005-8005-000000000002', 'TXN-DEMO-2026-00002',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'loss', 'payable',
     'b1000001-1001-4001-8001-000000000003', 'auto',
     80000.00, 'USD', 1385.000000, 110800000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] 화재 Treaty 보험금 원거래',
     'confirmed', true, false),
    ('b5100005-5005-4005-8005-000000000003', 'TXN-DEMO-2026-00003',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'commission', 'payable',
     'b1000001-1001-4001-8001-000000000003', 'auto',
     112000.00, 'USD', 1385.000000, 155120000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] 출재수수료 원거래 (보험료의 28%)',
     'confirmed', true, false),
    ('b5100005-5005-4005-8005-000000000011', 'TXN-DEMO-2026-00004',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'premium', 'receivable',
     'b2000002-2002-4002-8002-000000000010', 'auto',
     200000.00, 'USD', 1385.000000, 277000000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Munich Re 지분 50%',
     'billed', false, true),
    ('b5100005-5005-4005-8005-000000000012', 'TXN-DEMO-2026-00005',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'loss', 'payable',
     'b2000002-2002-4002-8002-000000000010', 'auto',
     40000.00, 'USD', 1385.000000, 55400000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Munich Re 보험금 50%',
     'billed', false, true),
    ('b5100005-5005-4005-8005-000000000013', 'TXN-DEMO-2026-00006',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'commission', 'payable',
     'b2000002-2002-4002-8002-000000000010', 'auto',
     56000.00, 'USD', 1385.000000, 77560000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Munich Re 수수료 50%',
     'billed', false, true),
    ('b5100005-5005-4005-8005-000000000021', 'TXN-DEMO-2026-00007',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'premium', 'receivable',
     'b2000002-2002-4002-8002-000000000012', 'auto',
     200000.00, 'USD', 1385.000000, 277000000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Gen Re 지분 50%',
     'confirmed', false, false),
    ('b5100005-5005-4005-8005-000000000022', 'TXN-DEMO-2026-00008',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'loss', 'payable',
     'b2000002-2002-4002-8002-000000000012', 'auto',
     40000.00, 'USD', 1385.000000, 55400000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Gen Re 보험금 50%',
     'confirmed', false, false),
    ('b5100005-5005-4005-8005-000000000023', 'TXN-DEMO-2026-00009',
     'b3100003-3003-4003-8003-000000000001', 'treaty', 'commission', 'payable',
     'b2000002-2002-4002-8002-000000000012', 'auto',
     56000.00, 'USD', 1385.000000, 77560000.00,
     '2026-04-02', '2026-01-01', '2026-03-31',
     '[데모][2026Q1] Gen Re 수수료 50%',
     'confirmed', false, false)
ON CONFLICT (transaction_no) DO NOTHING;

-- TRT-DEMO-2026-MAR-KRW — 상반기 보험료 (원화, Swiss Re 100%)
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
    ('b5100005-5005-4005-8005-000000000031', 'TXN-DEMO-2026-00010',
     'b3100003-3003-4003-8003-000000000002', 'treaty', 'premium', 'receivable',
     'b1000001-1001-4001-8001-000000000002', 'auto',
     120000000.00, 'KRW', 1.000000, 120000000.00,
     '2026-04-05', '2026-01-01', '2026-06-30',
     '[데모][2026상반기] 해상 Treaty 출재보험료 원거래',
     'confirmed', true, false),
    ('b5100005-5005-4005-8005-000000000032', 'TXN-DEMO-2026-00011',
     'b3100003-3003-4003-8003-000000000002', 'treaty', 'premium', 'receivable',
     'b2000002-2002-4002-8002-000000000011', 'auto',
     120000000.00, 'KRW', 1.000000, 120000000.00,
     '2026-04-05', '2026-01-01', '2026-06-30',
     '[데모][2026상반기] Swiss Re 100% 보험료',
     'confirmed', false, false)
ON CONFLICT (transaction_no) DO NOTHING;

-- FAC-DEMO-2026-KB-ENG — Gen Re 100%
INSERT INTO rs_transactions
    (id, transaction_no, contract_id, contract_type, transaction_type, direction,
     counterparty_id, allocation_type,
     amount_original, currency_code, exchange_rate, amount_krw,
     transaction_date, period_from, period_to,
     description, status, is_allocation_parent, is_locked)
VALUES
    ('b5100005-5005-4005-8005-000000000041', 'TXN-DEMO-2026-00012',
     'b3100003-3003-4003-8003-000000000003', 'facultative', 'premium', 'receivable',
     'b2000002-2002-4002-8002-000000000012', NULL,
     85000.00, 'USD', 1385.000000, 117725000.00,
     '2026-04-08', '2026-02-01', '2026-03-31',
     '[데모][FAC] 건설공사 임의재보 보험료 — Gen Re 100%',
     'confirmed', false, false)
ON CONFLICT (transaction_no) DO NOTHING;

-- Parent → child 링크 (Treaty fire)
UPDATE rs_transactions SET parent_tx_id = 'b5100005-5005-4005-8005-000000000001'
WHERE id IN (
    'b5100005-5005-4005-8005-000000000011', 'b5100005-5005-4005-8005-000000000021')
  AND parent_tx_id IS NULL;
UPDATE rs_transactions SET parent_tx_id = 'b5100005-5005-4005-8005-000000000002'
WHERE id IN (
    'b5100005-5005-4005-8005-000000000012', 'b5100005-5005-4005-8005-000000000022')
  AND parent_tx_id IS NULL;
UPDATE rs_transactions SET parent_tx_id = 'b5100005-5005-4005-8005-000000000003'
WHERE id IN (
    'b5100005-5005-4005-8005-000000000013', 'b5100005-5005-4005-8005-000000000023')
  AND parent_tx_id IS NULL;

UPDATE rs_transactions SET parent_tx_id = 'b5100005-5005-4005-8005-000000000031'
WHERE id = 'b5100005-5005-4005-8005-000000000032' AND parent_tx_id IS NULL;

-- =============================================================================
-- 보험료 명세 (프로세스 2단계 연계)
-- =============================================================================
INSERT INTO rs_premium_bordereau
    (id, contract_id, transaction_id, period_yyyyqn, policy_no, insured_name,
     risk_period_from, risk_period_to, sum_insured, original_premium, cession_pct, ceded_premium,
     entry_type, currency, validation_status)
VALUES
    ('b6100006-6006-4006-8006-000000000001', 'b3100003-3003-4003-8003-000000000001',
     NULL, '2026Q1', 'MRZ-F-2026-001', '○○물류(주)',
     '2026-01-10', '2026-12-31', 5000000000.00, 240000.00, 0.5000, 120000.00,
     'new', 'USD', 'valid'),
    ('b6100006-6006-4006-8006-000000000002', 'b3100003-3003-4003-8003-000000000001',
     NULL, '2026Q1', 'MRZ-F-2026-002', '△△제조(주)',
     '2026-02-01', '2026-12-31', 8000000000.00, 320000.00, 0.5000, 160000.00,
     'new', 'USD', 'valid'),
    ('b6100006-6006-4006-8006-000000000003', 'b3100003-3003-4003-8003-000000000002',
     NULL, '2026S1', 'HD-M-2026-7788', '한국선박(주)',
     '2026-01-01', '2026-12-31', 20000000000.00, 120000000.00, 1.0000, 120000000.00,
     'new', 'KRW', 'valid')
ON CONFLICT (id) DO NOTHING;

-- 손해 명세 (계약 1)
INSERT INTO rs_loss_bordereau
    (id, contract_id, transaction_id, premium_bordereau_id, period_yyyyqn,
     claim_no, loss_date, report_date, paid_amount, os_reserve, cession_pct, recoverable_amount,
     is_cash_loss, loss_status, currency, validation_status)
VALUES
    ('b6100006-6006-4006-8006-000000000010', 'b3100003-3003-4003-8003-000000000001',
     NULL, 'b6100006-6006-4006-8006-000000000001', '2026Q1',
     'CLM-MRZ-2026-0042', '2026-02-18', '2026-02-20',
     160000.00, 0.00, 0.5000, 80000.00,
     false, 'paid', 'USD', 'valid')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 정산서 (SOA) — Munich Re 발행분 + Swiss Re 초안
-- =============================================================================
INSERT INTO rs_account_currents
    (id, ac_no, contract_id, counterparty_id, direction,
     period_type, period_from, period_to, currency_code,
     balance_bf, subtotal_premium, subtotal_loss, subtotal_commission, subtotal_other, net_balance,
     status, due_date, notes, approved_at, issued_at)
VALUES
    (
        'b7100007-7007-4007-8007-000000000001', 'AC-DEMO-2026-00001',
        'b3100003-3003-4003-8003-000000000001',
        'b2000002-2002-4002-8002-000000000010',
        'to_reinsurer', 'quarterly', '2026-01-01', '2026-03-31', 'USD',
        0.00, 200000.00, -40000.00, -56000.00, 0.00, 104000.00,
        'issued', '2026-05-15',
        '데모: Munich Re 2026Q1 SOA (보험료 20만 − 손해 4만 − 수수료 5.6만 = 10.4만 USD)',
        '2026-04-10 10:00:00+09', '2026-04-10 11:00:00+09'
    ),
    (
        'b7100007-7007-4007-8007-000000000002', 'AC-DEMO-2026-00002',
        'b3100003-3003-4003-8003-000000000002',
        'b2000002-2002-4002-8002-000000000011',
        'to_reinsurer', 'semiannual', '2026-01-01', '2026-06-30', 'KRW',
        0.00, 120000000.00, 0.00, 0.00, 0.00, 120000000.00,
        'draft', NULL,
        '데모: 현대해상×Swiss Re 상반기 보험료 SOA 초안 (명세·거래 연계 확인용)', NULL, NULL
    ),
    (
        'b7100007-7007-4007-8007-000000000003', 'AC-DEMO-2026-00003',
        'b3100003-3003-4003-8003-000000000001',
        'b2000002-2002-4002-8002-000000000012',
        'to_reinsurer', 'quarterly', '2026-01-01', '2026-03-31', 'USD',
        0.00, 200000.00, -40000.00, -56000.00, 0.00, 104000.00,
        'draft', '2026-05-18',
        '데모: Gen Re 2026Q1 SOA 초안 — 승인·발행 전 (동일 기간 Munich Re SOA와 비교)', NULL, NULL
    )
ON CONFLICT (ac_no) DO NOTHING;

UPDATE rs_transactions SET
    account_current_id = 'b7100007-7007-4007-8007-000000000001',
    status = 'billed',
    is_locked = true
WHERE id IN (
    'b5100005-5005-4005-8005-000000000011',
    'b5100005-5005-4005-8005-000000000012',
    'b5100005-5005-4005-8005-000000000013');

UPDATE rs_transactions SET
    account_current_id = 'b7100007-7007-4007-8007-000000000003'
WHERE id IN (
    'b5100005-5005-4005-8005-000000000021',
    'b5100005-5005-4005-8005-000000000022',
    'b5100005-5005-4005-8005-000000000023');

UPDATE rs_transactions SET
    account_current_id = 'b7100007-7007-4007-8007-000000000002'
WHERE id = 'b5100005-5005-4005-8005-000000000032';

INSERT INTO rs_account_current_items
    (ac_id, tx_id, transaction_type, description,
     amount_original, currency_code, exchange_rate, amount_settlement_currency, direction, snapshot_date)
VALUES
    ('b7100007-7007-4007-8007-000000000001', 'b5100005-5005-4005-8005-000000000011',
     'premium', '[데모][2026Q1] Munich Re 보험료 50%',
     200000.00, 'USD', 1.000000, 200000.00, 'receivable', '2026-04-10 11:00:00+09'),
    ('b7100007-7007-4007-8007-000000000001', 'b5100005-5005-4005-8005-000000000012',
     'loss', '[데모][2026Q1] Munich Re 손해 50%',
     40000.00, 'USD', 1.000000, 40000.00, 'payable', '2026-04-10 11:00:00+09'),
    ('b7100007-7007-4007-8007-000000000001', 'b5100005-5005-4005-8005-000000000013',
     'commission', '[데모][2026Q1] Munich Re 수수료 50%',
     56000.00, 'USD', 1.000000, 56000.00, 'payable', '2026-04-10 11:00:00+09')
ON CONFLICT (ac_id, tx_id) DO NOTHING;

-- Gen Re SOA는 아직 미발행이므로 스냅샷 항목 없음 (승인 후 발행 흐름 가정)

-- =============================================================================
-- 결제 + 매칭 (프로세스 6단계 일부)
-- =============================================================================
INSERT INTO rs_settlements
    (id, settlement_no, settlement_type, counterparty_id,
     amount, currency_code, exchange_rate, amount_krw,
     settlement_date, bank_reference, match_status, matched_amount, notes)
VALUES
    (
        'b8100008-8008-4008-8008-000000000001', 'PAY-DEMO-2026-00001',
        'receipt',
        'b2000002-2002-4002-8002-000000000010',
        104000.00, 'USD', 1385.000000, 144040000.00,
        '2026-04-25', 'SWIFT-MRG-20260425-001',
        'fully_matched', 104000.00,
        '데모: Munich Re AC-DEMO-2026-00001 정산금 수령'
    )
ON CONFLICT (settlement_no) DO NOTHING;

INSERT INTO rs_settlement_matches
    (id, settlement_id, account_current_id, matched_amount, currency_code, notes)
VALUES
    (
        'b9100009-9009-4009-8009-000000000001',
        'b8100008-8008-4008-8008-000000000001',
        'b7100007-7007-4007-8007-000000000001',
        104000.00, 'USD',
        '데모: SOA 전액 매칭'
    )
ON CONFLICT (settlement_id, account_current_id) DO NOTHING;

-- 대사 1건 (Munich 보험료 일치)
INSERT INTO rs_reconciliation_items
    (id, counterparty_id, contract_id, period_from, period_to,
     transaction_type, tx_id, broker_amount, counterparty_claimed_amount, status, notes)
VALUES
    (
        'ba10000a-a00a-400a-800a-000000000001',
        'b2000002-2002-4002-8002-000000000010',
        'b3100003-3003-4003-8003-000000000001',
        '2026-01-01', '2026-03-31',
        'premium',
        'b5100005-5005-4005-8005-000000000011',
        200000.00, 200000.00, 'matched',
        '데모: Munich Re 2026Q1 보험료 대사 일치'
    )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
SELECT 'step5 demo: counterparties + 3 contracts + bordereau + tx + AC + settlement applied' AS result;
