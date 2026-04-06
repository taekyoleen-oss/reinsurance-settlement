-- =============================================================================
-- step1_schema.sql
-- 재보험 정청산 관리 시스템 (Reinsurance Settlement Management System)
-- 데이터베이스 스키마 v1.3
-- 생성일: 2026-04-02
-- =============================================================================
-- 실행 전제: Supabase (PostgreSQL 15+), uuid-ossp 또는 pgcrypto 확장 활성화
-- 멱등성: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS 사용
-- =============================================================================

-- uuid-ossp 확장 활성화 (Supabase 기본 제공)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. rs_currencies — 통화 마스터 (FK 참조 없음, 최우선 생성)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_currencies (
    code            char(3)     PRIMARY KEY,                    -- ISO 통화 코드 (USD, EUR, GBP, JPY, KRW)
    name_ko         text        NOT NULL,                       -- 한국어 명칭
    name_en         text        NOT NULL,                       -- 영문 명칭
    symbol          text        NOT NULL,                       -- 기호 ($, €, £, ¥, ₩)
    decimal_digits  int         NOT NULL DEFAULT 2,             -- 소수점 자리수 (JPY: 0, KRW: 0, 기타: 2)
    is_base         boolean     NOT NULL DEFAULT false,         -- 기준 통화 (KRW = true)
    is_active       boolean     NOT NULL DEFAULT true,
    display_order   int         NOT NULL DEFAULT 99,            -- UI 정렬 순서
    created_by      uuid        REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_currencies IS '통화 마스터 — 기본 5종(USD/EUR/GBP/JPY/KRW) + 관리자 확장 가능';
COMMENT ON COLUMN rs_currencies.is_base IS 'true = 기준 통화(KRW). 모든 외화 금액은 amount_krw에 환산 병행 저장';

-- =============================================================================
-- 2. rs_counterparties — 출재사/수재사 거래상대방 마스터
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_counterparties (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code        text        NOT NULL UNIQUE,            -- 사내 거래처 코드
    company_name_ko     text        NOT NULL,                   -- 한국어 회사명
    company_name_en     text        NOT NULL,                   -- 영문 회사명
    company_type        text        NOT NULL                    -- 'cedant' | 'reinsurer' | 'both'
                            CHECK (company_type IN ('cedant', 'reinsurer', 'both')),
    country_code        char(2),                                -- ISO 3166-1 alpha-2 국가코드
    default_currency    char(3)     REFERENCES rs_currencies(code),
    contact_email       text,
    is_active           boolean     NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_counterparties IS '출재사(cedant), 수재사(reinsurer), 겸업(both) 거래상대방 마스터';
COMMENT ON COLUMN rs_counterparties.company_type IS 'cedant=출재사, reinsurer=수재사, both=겸업';

-- =============================================================================
-- 3. rs_contracts — Treaty/Facultative 계약 마스터
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_contracts (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_no         text        NOT NULL UNIQUE,            -- 사내 채번 (예: TRT-2025-001)
    contract_type       text        NOT NULL                    -- 'treaty' | 'facultative'
                            CHECK (contract_type IN ('treaty', 'facultative')),
    treaty_type         text                                    -- 'proportional' | 'non_proportional' (treaty만 해당)
                            CHECK (treaty_type IS NULL OR treaty_type IN ('proportional', 'non_proportional')),
    class_of_business   text        NOT NULL                    -- 보험 종목
                            CHECK (class_of_business IN ('fire', 'marine', 'liability', 'engineering', 'misc')),
    cedant_id           uuid        NOT NULL REFERENCES rs_counterparties(id),
    inception_date      date        NOT NULL,
    expiry_date         date,
    settlement_currency char(3)     NOT NULL REFERENCES rs_currencies(code),
    settlement_period   text        NOT NULL                    -- 'quarterly' | 'semiannual' | 'annual' | 'adhoc'
                            CHECK (settlement_period IN ('quarterly', 'semiannual', 'annual', 'adhoc')),
    status              text        NOT NULL DEFAULT 'active'   -- 'active' | 'expired' | 'cancelled'
                            CHECK (status IN ('active', 'expired', 'cancelled')),
    description         text,
    created_by          uuid        REFERENCES auth.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_contracts IS 'Treaty(비례/비비례) 및 Facultative 계약 마스터';
COMMENT ON COLUMN rs_contracts.treaty_type IS 'proportional=비례재보험(자동배분 지원), non_proportional=비비례재보험(수동입력만)';
COMMENT ON COLUMN rs_contracts.settlement_period IS '정산 주기: quarterly=분기, semiannual=반기, annual=연간, adhoc=수시';

-- =============================================================================
-- 4. rs_contract_shares — 수재사 지분율 (Treaty 계약용)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_contract_shares (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id         uuid        NOT NULL REFERENCES rs_contracts(id) ON DELETE CASCADE,
    reinsurer_id        uuid        NOT NULL REFERENCES rs_counterparties(id),
    signed_line         numeric(6,3) NOT NULL                  -- 지분율 % (예: 30.000)
                            CHECK (signed_line > 0 AND signed_line <= 100),
    order_of_priority   int         NOT NULL DEFAULT 1,         -- 소수점 오차 흡수 우선순위 (1 = 최우선)
    effective_from      date        NOT NULL,
    effective_to        date,                                   -- NULL = 현재 유효 (Endorsement 이력 관리)
    created_at          timestamptz NOT NULL DEFAULT now(),
    -- 동일 계약+수재사+유효기간 중복 방지
    CONSTRAINT uq_contract_reinsurer_period UNIQUE (contract_id, reinsurer_id, effective_from)
);

COMMENT ON TABLE rs_contract_shares IS '계약별 수재사 지분율. effective_to IS NULL = 현재 유효. Endorsement 이력 보관용';
COMMENT ON COLUMN rs_contract_shares.order_of_priority IS '1순위 수재사가 Treaty 자동배분 소수점 오차를 흡수함';
COMMENT ON COLUMN rs_contract_shares.effective_to IS 'NULL이면 현재 유효한 지분율. Endorsement 시 이전 레코드 effective_to 업데이트 후 신규 레코드 추가';

-- =============================================================================
-- 5. rs_user_profiles — 사용자 프로필 및 역할 (싱글 테넌트)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_user_profiles (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text        NOT NULL                            -- 역할 분류
                    CHECK (role IN ('broker_technician', 'broker_manager', 'cedant_viewer', 'reinsurer_viewer', 'admin')),
    company_id  uuid        REFERENCES rs_counterparties(id),  -- NULL = 브로커 내부 직원
    full_name   text        NOT NULL,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_user_profiles IS '사용자 역할·소속. company_id=NULL이면 브로커 내부 직원, NOT NULL이면 외부 뷰어(출재사/수재사 소속)';
COMMENT ON COLUMN rs_user_profiles.role IS 'broker_technician=브로커실무자, broker_manager=브로커관리자, cedant_viewer=출재사뷰어, reinsurer_viewer=수재사뷰어, admin=시스템관리자';

-- =============================================================================
-- 6. rs_exchange_rates — 다통화 환율 이력
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_exchange_rates (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency   char(3)     NOT NULL REFERENCES rs_currencies(code),
    to_currency     char(3)     NOT NULL DEFAULT 'KRW',         -- 기준 통화(KRW)로의 환율
    rate            numeric(15,6) NOT NULL                      -- 환율 (1 from_currency = rate KRW)
                        CHECK (rate > 0),
    rate_date       date        NOT NULL,
    rate_type       text        NOT NULL                        -- 'spot' | 'monthly_avg' | 'custom'
                        CHECK (rate_type IN ('spot', 'monthly_avg', 'custom')),
    source          text,                                       -- '한국은행' | '사내기준' | 기타
    notes           text,
    created_by      uuid        REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_exchange_rate UNIQUE (from_currency, rate_date, rate_type)
);

COMMENT ON TABLE rs_exchange_rates IS '수동 환율 이력. 모든 외화 거래 입력 시 해당 날짜 환율 선택 후 amount_krw 계산';

-- =============================================================================
-- 7. rs_transactions — 거래 내역 (핵심 테이블)
-- =============================================================================

-- 일련번호 자동 채번용 Sequence (연도별 리셋 없음 — 연도 포함 포맷으로 구분)
CREATE SEQUENCE IF NOT EXISTS seq_transaction_no START 1;

CREATE TABLE IF NOT EXISTS rs_transactions (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no          text        NOT NULL UNIQUE,        -- 자동 채번 (TXN-YYYY-NNNNN)
    contract_id             uuid        NOT NULL REFERENCES rs_contracts(id),
    contract_type           text        NOT NULL                -- 비정규화 캐시 ('treaty' | 'facultative')
                                CHECK (contract_type IN ('treaty', 'facultative')),
    transaction_type        text        NOT NULL
                                CHECK (transaction_type IN (
                                    'premium', 'return_premium', 'loss',
                                    'commission', 'deposit_premium', 'interest', 'adjustment'
                                )),
    direction               text        NOT NULL                -- 브로커 기준 방향
                                CHECK (direction IN ('receivable', 'payable')),
    counterparty_id         uuid        NOT NULL REFERENCES rs_counterparties(id),
    parent_tx_id            uuid        REFERENCES rs_transactions(id), -- Treaty 자동배분 시 원거래 참조

    -- 배분 방식
    allocation_type         text                                -- 'auto' | 'manual' | NULL (Fac)
                                CHECK (allocation_type IS NULL OR allocation_type IN ('auto', 'manual')),

    -- 금액
    amount_original         numeric(18,2) NOT NULL,
    currency_code           char(3)     NOT NULL REFERENCES rs_currencies(code),
    exchange_rate           numeric(15,6),                      -- → KRW 환율 (KRW 거래 시 1.000000)
    amount_krw              numeric(18,2),                      -- KRW 환산 병행 저장

    -- 날짜
    transaction_date        date        NOT NULL,
    due_date                date,                               -- 지급 기한
    period_from             date,
    period_to               date,

    -- 참조 정보
    loss_reference          text,                               -- 보험금 청구 번호
    description             text,

    -- 상태
    status                  text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'confirmed', 'billed', 'settled', 'cancelled')),
    account_current_id      uuid,                               -- FK는 rs_account_currents 생성 후 ALTER로 추가
    is_locked               boolean     NOT NULL DEFAULT false, -- 정산서 승인 후 수정 차단
    is_deleted              boolean     NOT NULL DEFAULT false, -- Soft Delete

    -- Treaty 자동 배분 Parent 식별 (v1.3)
    -- true = 출재사(Cedant)용 원거래 → Outstanding 계산에서 제외
    is_allocation_parent    boolean     NOT NULL DEFAULT false,

    -- 감사
    created_by              uuid        REFERENCES auth.users(id),
    updated_by              uuid        REFERENCES auth.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_transactions IS '개별 거래 내역. Treaty 자동배분 시 parent_tx_id로 원거래 참조. is_allocation_parent=true 레코드는 Outstanding 계산 제외';
COMMENT ON COLUMN rs_transactions.is_allocation_parent IS 'true=출재사 원거래(Outstanding 계산 제외). false(기본)=수재사 배분 거래 또는 Fac 개별 거래';
COMMENT ON COLUMN rs_transactions.is_locked IS 'true=정산서 승인/발행 후 수정 차단. AC cancelled 시 자동 false 해제(fn_unlock_on_ac_cancel 트리거)';

-- =============================================================================
-- 8. rs_transaction_audit — 거래 수정 이력 (Audit Trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_transaction_audit (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  uuid        NOT NULL REFERENCES rs_transactions(id),
    changed_by      uuid        REFERENCES auth.users(id),
    changed_at      timestamptz NOT NULL DEFAULT now(),
    action          text        NOT NULL                        -- 'create' | 'update' | 'delete'
                        CHECK (action IN ('create', 'update', 'delete')),
    old_values      jsonb,                                      -- 변경 전 값 (JSON)
    new_values      jsonb,                                      -- 변경 후 값 (JSON)
    reason          text                                        -- 변경 사유
);

COMMENT ON TABLE rs_transaction_audit IS '거래 수정/삭제 이력 보존. 모든 변경 사항을 old_values/new_values JSON으로 기록';

-- =============================================================================
-- 9. rs_account_currents — 정산서 헤더
-- =============================================================================

-- 정산서 번호 채번용 Sequence
CREATE SEQUENCE IF NOT EXISTS seq_account_current_no START 1;

CREATE TABLE IF NOT EXISTS rs_account_currents (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_no               text        NOT NULL UNIQUE,            -- 채번 (AC-YYYY-NNNNN)
    contract_id         uuid        NOT NULL REFERENCES rs_contracts(id),
    counterparty_id     uuid        NOT NULL REFERENCES rs_counterparties(id),
    direction           text        NOT NULL                    -- 'to_cedant' | 'to_reinsurer'
                            CHECK (direction IN ('to_cedant', 'to_reinsurer')),
    period_type         text        NOT NULL                    -- 정산 주기
                            CHECK (period_type IN ('quarterly', 'semiannual', 'annual', 'adhoc')),
    period_from         date        NOT NULL,
    period_to           date        NOT NULL,
    currency_code       char(3)     NOT NULL REFERENCES rs_currencies(code),

    -- 집계 금액
    balance_bf          numeric(18,2) NOT NULL DEFAULT 0,       -- Balance Brought Forward (직전 AC 미청산 이월)
    subtotal_premium    numeric(18,2) NOT NULL DEFAULT 0,       -- 보험료 소계
    subtotal_loss       numeric(18,2) NOT NULL DEFAULT 0,       -- 보험금 소계
    subtotal_commission numeric(18,2) NOT NULL DEFAULT 0,       -- 수수료 소계
    subtotal_other      numeric(18,2) NOT NULL DEFAULT 0,       -- 기타 소계 (deposit_premium, interest 등)
    net_balance         numeric(18,2) NOT NULL DEFAULT 0,       -- 순액 (양수=수재사→브로커, 음수=브로커→수재사)

    -- 승인 워크플로우
    status              text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                                'draft', 'pending_approval', 'approved',
                                'issued', 'acknowledged', 'disputed', 'cancelled'
                            )),
    -- cancelled: Disputed 해결 시 원본 AC를 cancelled 처리 → 연결 거래 is_locked 자동 해제 (트리거)
    approved_by         uuid        REFERENCES auth.users(id),
    approved_at         timestamptz,
    issued_at           timestamptz,
    due_date            date,
    notes               text,

    created_by          uuid        REFERENCES auth.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_account_currents IS '정산서(Account Current) 헤더. 1 AC = 1 수재사. status=cancelled 시 연결 거래 is_locked 자동 해제';
COMMENT ON COLUMN rs_account_currents.balance_bf IS 'B/F = 직전 AC net_balance - 직전 AC에 매칭된 settlement 합계(rs_settlement_matches)';
COMMENT ON COLUMN rs_account_currents.status IS 'draft→pending_approval→approved→issued→acknowledged/disputed. cancelled=Disputed 해결 재발행 시 원본 취소';

-- rs_transactions.account_current_id FK 추가 (rs_account_currents 생성 후)
ALTER TABLE rs_transactions
    ADD CONSTRAINT IF NOT EXISTS fk_tx_account_current
    FOREIGN KEY (account_current_id) REFERENCES rs_account_currents(id);

-- =============================================================================
-- 10. rs_account_current_items — 정산서 스냅샷 항목 (v1.3)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_account_current_items (
    ac_id                       uuid        NOT NULL REFERENCES rs_account_currents(id) ON DELETE CASCADE,
    tx_id                       uuid        NOT NULL REFERENCES rs_transactions(id),
    transaction_type            text        NOT NULL
                                    CHECK (transaction_type IN (
                                        'premium', 'return_premium', 'loss',
                                        'commission', 'deposit_premium', 'interest', 'adjustment'
                                    )),
    description                 text,
    amount_original             numeric(18,2) NOT NULL,
    currency_code               char(3)     NOT NULL REFERENCES rs_currencies(code),
    exchange_rate               numeric(15,6),
    amount_settlement_currency  numeric(18,2) NOT NULL,         -- AC의 settlement_currency로 환산된 금액
    direction                   text        NOT NULL            -- 'receivable' | 'payable'
                                    CHECK (direction IN ('receivable', 'payable')),
    snapshot_date               timestamptz NOT NULL DEFAULT now(), -- 스냅샷 생성 시각 (= issued_at)
    PRIMARY KEY (ac_id, tx_id)
);

COMMENT ON TABLE rs_account_current_items IS 'AC issued 시 해당 시점 거래 항목 스냅샷 저장. 이후 원본 거래 수정에 무관하게 AC 발행 내역 보존';

-- =============================================================================
-- 11. rs_settlements — 실제 결제(송금/수금) 내역
-- =============================================================================

-- 결제 번호 채번용 Sequence
CREATE SEQUENCE IF NOT EXISTS seq_settlement_no START 1;

CREATE TABLE IF NOT EXISTS rs_settlements (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_no       text        NOT NULL UNIQUE,            -- 채번 (PAY-YYYY-NNNNN)
    settlement_type     text        NOT NULL                    -- 브로커 기준
                            CHECK (settlement_type IN ('receipt', 'payment')),
    counterparty_id     uuid        NOT NULL REFERENCES rs_counterparties(id),
    amount              numeric(18,2) NOT NULL
                            CHECK (amount > 0),
    currency_code       char(3)     NOT NULL REFERENCES rs_currencies(code),
    exchange_rate       numeric(15,6),
    amount_krw          numeric(18,2),
    settlement_date     date        NOT NULL,                   -- 실제 Value Date
    bank_reference      text,                                   -- 은행 송금 참조번호
    match_status        text        NOT NULL DEFAULT 'unmatched'
                            CHECK (match_status IN ('unmatched', 'partial', 'fully_matched')),
    matched_amount      numeric(18,2) NOT NULL DEFAULT 0,
    notes               text,
    created_by          uuid        REFERENCES auth.users(id),
    created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_settlements IS '실제 송금/수금 결제 내역. rs_settlement_matches로 정산서와 1:1 또는 1:N 매칭';

-- =============================================================================
-- 12. rs_settlement_matches — 결제 ↔ 정산서 매칭
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_settlement_matches (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id       uuid        NOT NULL REFERENCES rs_settlements(id) ON DELETE CASCADE,
    account_current_id  uuid        NOT NULL REFERENCES rs_account_currents(id),
    matched_amount      numeric(18,2) NOT NULL                  -- 이 매칭에 적용된 금액
                            CHECK (matched_amount > 0),
    currency_code       char(3)     NOT NULL REFERENCES rs_currencies(code),
    matched_by          uuid        REFERENCES auth.users(id),
    matched_at          timestamptz NOT NULL DEFAULT now(),
    notes               text,
    CONSTRAINT uq_settlement_ac_match UNIQUE (settlement_id, account_current_id)
);

COMMENT ON TABLE rs_settlement_matches IS '결제(settlement) ↔ 정산서(account_current) 매칭 테이블. 1:1 완전 매칭 또는 1:N 부분 매칭 지원';

-- =============================================================================
-- 13. rs_reconciliation_items — 대사 항목 (브로커 전용)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_reconciliation_items (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id             uuid        NOT NULL REFERENCES rs_counterparties(id),
    contract_id                 uuid        NOT NULL REFERENCES rs_contracts(id),
    period_from                 date        NOT NULL,
    period_to                   date        NOT NULL,
    transaction_type            text        NOT NULL
                                    CHECK (transaction_type IN (
                                        'premium', 'return_premium', 'loss',
                                        'commission', 'adjustment'
                                    )),
    tx_id                       uuid        REFERENCES rs_transactions(id), -- 브로커 측 거래 참조
    broker_amount               numeric(18,2) NOT NULL,                     -- 브로커 장부상 금액
    counterparty_claimed_amount numeric(18,2),                              -- 상대방 주장 금액 (수동 입력)
    difference                  numeric(18,2)                               -- broker_amount - counterparty_claimed_amount (자동 계산)
                                    GENERATED ALWAYS AS (
                                        CASE
                                            WHEN counterparty_claimed_amount IS NOT NULL
                                            THEN broker_amount - counterparty_claimed_amount
                                            ELSE NULL
                                        END
                                    ) STORED,
    status                      text        NOT NULL DEFAULT 'unmatched'
                                    CHECK (status IN ('matched', 'unmatched', 'disputed')),
    notes                       text,
    created_by                  uuid        REFERENCES auth.users(id),
    created_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_reconciliation_items IS '브로커 ↔ 거래상대방 장부 대사 항목. 브로커 내부 직원만 접근. difference는 Generated Column으로 자동 계산';

-- =============================================================================
-- 14. rs_share_tokens — 만료형 토큰 URL 관리 (v1.2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_share_tokens (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    token       text        NOT NULL UNIQUE,                    -- 무작위 생성 UUID (crypto.randomUUID())
    target_type text        NOT NULL DEFAULT 'account_current'  -- 향후 확장 가능
                    CHECK (target_type IN ('account_current')),
    target_id   uuid        NOT NULL REFERENCES rs_account_currents(id),
    created_by  uuid        REFERENCES auth.users(id),
    expires_at  timestamptz NOT NULL                            -- 기본: 생성 시각 + 30일
                    DEFAULT (now() + interval '30 days'),
    revoked     boolean     NOT NULL DEFAULT false,
    revoked_by  uuid        REFERENCES auth.users(id),
    revoked_at  timestamptz,
    notes       text,                                           -- 공유 목적 메모
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_share_tokens IS '만료형 토큰 URL 관리. /share/[token] Route Handler에서 service_role_key로 처리(RLS 우회). 기본 30일 만료';

-- =============================================================================
-- 15. rs_share_token_logs — 토큰 URL 접근 로그 (v1.2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_share_token_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id    uuid        NOT NULL REFERENCES rs_share_tokens(id) ON DELETE CASCADE,
    accessed_at timestamptz NOT NULL DEFAULT now(),
    ip_address  inet,                                           -- 접근자 IP
    user_agent  text,                                           -- 브라우저 User-Agent
    action      text        NOT NULL DEFAULT 'view'             -- 'view' | 'download_pdf'
                    CHECK (action IN ('view', 'download_pdf'))
);

COMMENT ON TABLE rs_share_token_logs IS '토큰 URL 접근 감사 로그. IP, User-Agent, 행동(view/download_pdf) 기록';

-- =============================================================================
-- 자동 채번 트리거 함수 — TXN-YYYY-NNNNN
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_generate_transaction_no()
RETURNS TRIGGER AS $$
DECLARE
    v_year  text;
    v_seq   bigint;
BEGIN
    IF NEW.transaction_no IS NULL OR NEW.transaction_no = '' THEN
        v_year := to_char(CURRENT_DATE, 'YYYY');
        v_seq  := nextval('seq_transaction_no');
        NEW.transaction_no := 'TXN-' || v_year || '-' || lpad(v_seq::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_generate_transaction_no
    BEFORE INSERT ON rs_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_generate_transaction_no();

-- =============================================================================
-- 자동 채번 트리거 함수 — AC-YYYY-NNNNN
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_generate_ac_no()
RETURNS TRIGGER AS $$
DECLARE
    v_year  text;
    v_seq   bigint;
BEGIN
    IF NEW.ac_no IS NULL OR NEW.ac_no = '' THEN
        v_year := to_char(CURRENT_DATE, 'YYYY');
        v_seq  := nextval('seq_account_current_no');
        NEW.ac_no := 'AC-' || v_year || '-' || lpad(v_seq::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_generate_ac_no
    BEFORE INSERT ON rs_account_currents
    FOR EACH ROW EXECUTE FUNCTION fn_generate_ac_no();

-- =============================================================================
-- 자동 채번 트리거 함수 — PAY-YYYY-NNNNN
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_generate_settlement_no()
RETURNS TRIGGER AS $$
DECLARE
    v_year  text;
    v_seq   bigint;
BEGIN
    IF NEW.settlement_no IS NULL OR NEW.settlement_no = '' THEN
        v_year := to_char(CURRENT_DATE, 'YYYY');
        v_seq  := nextval('seq_settlement_no');
        NEW.settlement_no := 'PAY-' || v_year || '-' || lpad(v_seq::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_generate_settlement_no
    BEFORE INSERT ON rs_settlements
    FOR EACH ROW EXECUTE FUNCTION fn_generate_settlement_no();

-- =============================================================================
-- AC Cancelled 시 연결 거래 is_locked 자동 해제 트리거 (fn_unlock_on_ac_cancel)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_unlock_on_ac_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- AC status가 'cancelled'로 변경될 때
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        UPDATE rs_transactions
        SET is_locked = false,
            updated_at = now()
        WHERE account_current_id = NEW.id
          AND is_locked = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_unlock_on_ac_cancel
    AFTER UPDATE ON rs_account_currents
    FOR EACH ROW EXECUTE FUNCTION fn_unlock_on_ac_cancel();

-- =============================================================================
-- updated_at 자동 갱신 트리거 (공통)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_counterparties_updated_at
    BEFORE UPDATE ON rs_counterparties
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON rs_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON rs_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_account_currents_updated_at
    BEFORE UPDATE ON rs_account_currents
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- §4.4 핵심 인덱스
-- =============================================================================

-- Outstanding 계산 성능 — 미청산 현황 대시보드 핵심
CREATE INDEX IF NOT EXISTS idx_tx_status_counterparty
    ON rs_transactions(status, counterparty_id, currency_code)
    WHERE is_deleted = false;

-- Account Current 집계 성능 — AC 생성 시 거래 집계
CREATE INDEX IF NOT EXISTS idx_tx_ac_period
    ON rs_transactions(contract_id, period_from, period_to, status)
    WHERE is_deleted = false;

-- Aging 분석 성능 — 30/60/90/90+ 일 분류
CREATE INDEX IF NOT EXISTS idx_tx_due_date
    ON rs_transactions(due_date, status, direction)
    WHERE is_deleted = false AND status NOT IN ('settled', 'cancelled');

-- 토큰 URL 조회 성능 — /share/[token] Route Handler
CREATE INDEX IF NOT EXISTS idx_share_tokens_token
    ON rs_share_tokens(token)
    WHERE revoked = false;

-- 대사 항목 조회 성능 (v1.3)
CREATE INDEX IF NOT EXISTS idx_reconciliation_counterparty_period
    ON rs_reconciliation_items(counterparty_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_reconciliation_status
    ON rs_reconciliation_items(status)
    WHERE status IN ('unmatched', 'disputed');

-- Outstanding 계산: parent TX 제외 (is_allocation_parent = false 인 레코드만)
CREATE INDEX IF NOT EXISTS idx_tx_allocation_child
    ON rs_transactions(counterparty_id, currency_code, status)
    WHERE is_deleted = false AND is_allocation_parent = false;

-- 추가 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_tx_account_current_id
    ON rs_transactions(account_current_id)
    WHERE account_current_id IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_tx_contract_date
    ON rs_transactions(contract_id, transaction_date)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ac_contract_period
    ON rs_account_currents(contract_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_ac_counterparty_status
    ON rs_account_currents(counterparty_id, status);

CREATE INDEX IF NOT EXISTS idx_settlements_counterparty_date
    ON rs_settlements(counterparty_id, settlement_date);

CREATE INDEX IF NOT EXISTS idx_settlements_match_status
    ON rs_settlements(match_status)
    WHERE match_status IN ('unmatched', 'partial');

CREATE INDEX IF NOT EXISTS idx_settlement_matches_ac
    ON rs_settlement_matches(account_current_id);

CREATE INDEX IF NOT EXISTS idx_tx_audit_transaction_id
    ON rs_transaction_audit(transaction_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_token_logs_token_id
    ON rs_share_token_logs(token_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
    ON rs_user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id
    ON rs_user_profiles(company_id)
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_date
    ON rs_exchange_rates(from_currency, rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_contract_shares_contract_id
    ON rs_contract_shares(contract_id, effective_from, effective_to);

-- =============================================================================
-- 완료 메시지
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== step1_schema.sql 실행 완료 ===';
    RAISE NOTICE '생성된 테이블: rs_currencies, rs_counterparties, rs_contracts, rs_contract_shares,';
    RAISE NOTICE '  rs_user_profiles, rs_exchange_rates, rs_transactions, rs_transaction_audit,';
    RAISE NOTICE '  rs_account_currents, rs_account_current_items, rs_settlements, rs_settlement_matches,';
    RAISE NOTICE '  rs_reconciliation_items, rs_share_tokens, rs_share_token_logs';
    RAISE NOTICE '생성된 트리거: 채번(TXN/AC/PAY), fn_unlock_on_ac_cancel, updated_at 자동갱신';
    RAISE NOTICE '생성된 인덱스: 22개';
END $$;
