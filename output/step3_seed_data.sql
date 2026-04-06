-- =============================================================================
-- step3_seed_data.sql
-- 재보험 정청산 관리 시스템 — 초기 시드 데이터
-- 생성일: 2026-04-02
-- =============================================================================
-- 전제: step1_schema.sql, step2_rls_policies.sql 실행 완료 후 실행
-- 멱등성: INSERT ... ON CONFLICT DO NOTHING
-- =============================================================================

-- =============================================================================
-- 1. rs_currencies — 5개 기본 통화
-- =============================================================================
-- display_order: USD=1, EUR=2, GBP=3, JPY=4, KRW=5(기준 통화)
INSERT INTO rs_currencies
    (code, name_ko, name_en, symbol, decimal_digits, is_base, is_active, display_order)
VALUES
    -- USD: 미국 달러 (주요 결제 통화)
    ('USD', '미국 달러',   'US Dollar',         '$',  2, false, true, 1),
    -- EUR: 유로 (유럽 수재사)
    ('EUR', '유로',        'Euro',               '€',  2, false, true, 2),
    -- GBP: 영국 파운드 (런던 시장)
    ('GBP', '영국 파운드', 'British Pound',      '£',  2, false, true, 3),
    -- JPY: 일본 엔 (아시아 수재사) — 소수점 0자리
    ('JPY', '일본 엔',     'Japanese Yen',       '¥',  0, false, true, 4),
    -- KRW: 한국 원 (기준 통화, is_base=true) — 소수점 0자리
    ('KRW', '한국 원',     'Korean Won',         '₩',  0, true,  true, 5)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 2. rs_counterparties — 샘플 거래상대방 3개
-- =============================================================================
-- 2-1. 한국화재보험(주) — 출재사 (cedant)
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES
    (
        'a1b2c3d4-0001-0001-0001-000000000001',
        'CP-KHFIRE-001',
        '한국화재보험(주)',
        'Korea Fire Insurance Co., Ltd.',
        'cedant',
        'KR',
        'KRW',
        true
    )
ON CONFLICT (company_code) DO NOTHING;

-- 2-2. Munich Re Korea — 수재사 (reinsurer)
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES
    (
        'a1b2c3d4-0002-0002-0002-000000000002',
        'CP-MUNICHRE-001',
        '뮌헨재보험 한국지점',
        'Munich Re Korea Branch',
        'reinsurer',
        'DE',
        'EUR',
        true
    )
ON CONFLICT (company_code) DO NOTHING;

-- 2-3. Swiss Re Korea — 수재사 (reinsurer)
INSERT INTO rs_counterparties
    (id, company_code, company_name_ko, company_name_en, company_type, country_code, default_currency, is_active)
VALUES
    (
        'a1b2c3d4-0003-0003-0003-000000000003',
        'CP-SWISSRE-001',
        '스위스재보험 한국지점',
        'Swiss Re Korea Branch',
        'reinsurer',
        'CH',
        'USD',
        true
    )
ON CONFLICT (company_code) DO NOTHING;

-- =============================================================================
-- 3. rs_contracts — 샘플 Treaty Proportional 계약 1개
-- =============================================================================
-- 계약 조건:
--   - 유형: Treaty, 비례재보험(Proportional)
--   - 종목: 화재(fire)
--   - 출재사: 한국화재보험(주)
--   - 결제 통화: USD
--   - 정산 주기: 분기(quarterly)
--   - 유효 기간: 2025-01-01 ~ 2025-12-31
INSERT INTO rs_contracts
    (id, contract_no, contract_type, treaty_type, class_of_business,
     cedant_id, inception_date, expiry_date,
     settlement_currency, settlement_period, status, description)
VALUES
    (
        'c0c0c0c0-1111-1111-1111-000000000001',
        'TRT-2025-001',
        'treaty',
        'proportional',
        'fire',
        'a1b2c3d4-0001-0001-0001-000000000001',  -- 한국화재보험(주)
        '2025-01-01',
        '2025-12-31',
        'USD',                                    -- 결제 통화: USD
        'quarterly',                              -- 분기 정산
        'active',
        '2025년도 화재보험 비례재보험 Treaty (샘플 계약). Munich Re 60% + Swiss Re 40%.'
    )
ON CONFLICT (contract_no) DO NOTHING;

-- =============================================================================
-- 4. rs_contract_shares — 수재사 지분율 (Munich Re 60%, Swiss Re 40%)
-- =============================================================================
-- 4-1. Munich Re Korea — 60% (order_of_priority=1, 소수점 오차 흡수 우선)
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES
    (
        'd0d0d0d0-2222-2222-2222-000000000001',
        'c0c0c0c0-1111-1111-1111-000000000001',  -- TRT-2025-001
        'a1b2c3d4-0002-0002-0002-000000000002',  -- Munich Re Korea
        60.000,                                   -- 60%
        1,                                        -- 1순위 (소수점 오차 흡수)
        '2025-01-01',
        NULL                                      -- NULL = 현재 유효
    )
ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- 4-2. Swiss Re Korea — 40%
INSERT INTO rs_contract_shares
    (id, contract_id, reinsurer_id, signed_line, order_of_priority, effective_from, effective_to)
VALUES
    (
        'd0d0d0d0-3333-3333-3333-000000000002',
        'c0c0c0c0-1111-1111-1111-000000000001',  -- TRT-2025-001
        'a1b2c3d4-0003-0003-0003-000000000003',  -- Swiss Re Korea
        40.000,                                   -- 40%
        2,                                        -- 2순위
        '2025-01-01',
        NULL                                      -- NULL = 현재 유효
    )
ON CONFLICT (contract_id, reinsurer_id, effective_from) DO NOTHING;

-- =============================================================================
-- 5. 샘플 환율 데이터 (선택 사항 — 초기 운영 참고값)
-- =============================================================================
-- 2025-01-01 기준 참고 환율 (spot, 사내 기준)
INSERT INTO rs_exchange_rates
    (from_currency, to_currency, rate, rate_date, rate_type, source, notes)
VALUES
    ('USD', 'KRW', 1350.000000, '2025-01-01', 'custom', '사내기준', '2025년 1월 USD/KRW 사내 기준 환율'),
    ('EUR', 'KRW', 1460.000000, '2025-01-01', 'custom', '사내기준', '2025년 1월 EUR/KRW 사내 기준 환율'),
    ('GBP', 'KRW', 1710.000000, '2025-01-01', 'custom', '사내기준', '2025년 1월 GBP/KRW 사내 기준 환율'),
    ('JPY', 'KRW',    8.900000, '2025-01-01', 'custom', '사내기준', '2025년 1월 JPY/KRW 사내 기준 환율 (100엔 기준 890원)')
ON CONFLICT (from_currency, rate_date, rate_type) DO NOTHING;

-- =============================================================================
-- 검증 쿼리 (실행 결과 확인용)
-- =============================================================================
DO $$
DECLARE
    v_currency_count        int;
    v_counterparty_count    int;
    v_contract_count        int;
    v_share_count           int;
    v_share_total           numeric;
BEGIN
    SELECT COUNT(*) INTO v_currency_count     FROM rs_currencies;
    SELECT COUNT(*) INTO v_counterparty_count FROM rs_counterparties;
    SELECT COUNT(*) INTO v_contract_count     FROM rs_contracts;
    SELECT COUNT(*) INTO v_share_count        FROM rs_contract_shares;
    SELECT SUM(signed_line) INTO v_share_total
        FROM rs_contract_shares
        WHERE contract_id = 'c0c0c0c0-1111-1111-1111-000000000001'
          AND effective_to IS NULL;

    RAISE NOTICE '=== step3_seed_data.sql 실행 완료 ===';
    RAISE NOTICE 'rs_currencies:     % 행 (기대: 5)', v_currency_count;
    RAISE NOTICE 'rs_counterparties: % 행 (기대: 3)', v_counterparty_count;
    RAISE NOTICE 'rs_contracts:      % 행 (기대: 1)', v_contract_count;
    RAISE NOTICE 'rs_contract_shares: % 행 (기대: 2)', v_share_count;
    RAISE NOTICE 'TRT-2025-001 지분율 합계: %% (기대: 100.000)', v_share_total;

    IF v_share_total IS NOT NULL AND v_share_total <> 100 THEN
        RAISE WARNING '지분율 합계가 100%%가 아닙니다: %%', v_share_total;
    END IF;
END $$;
