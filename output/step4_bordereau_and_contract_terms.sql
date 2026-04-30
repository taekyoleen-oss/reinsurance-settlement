-- =============================================================================
-- step4_bordereau_and_contract_terms.sql
-- 재보험 정청산 관리 시스템 — v1.4 증분 마이그레이션
-- 생성일: 2026-04-30
-- 전제: step1_schema.sql (v1.3) 이미 적용 완료
-- 변경 내용:
--   1. rs_contracts 컬럼 추가 (수수료율·적립금율·이자율·정산조건)
--   2. rs_premium_bordereau 테이블 신설 (보험료 라인 명세)
--   3. rs_loss_bordereau 테이블 신설 (손해 라인 명세)
--   4. rs_counterparties company_type에 'broker' 추가
-- =============================================================================

-- =============================================================================
-- 1. rs_counterparties — company_type에 'broker' 추가
--    기존 CHECK 제약 삭제 후 재생성
-- =============================================================================
ALTER TABLE rs_counterparties
    DROP CONSTRAINT IF EXISTS rs_counterparties_company_type_check;

ALTER TABLE rs_counterparties
    ADD CONSTRAINT rs_counterparties_company_type_check
    CHECK (company_type IN ('cedant', 'reinsurer', 'both', 'broker'));

COMMENT ON COLUMN rs_counterparties.company_type IS
    'cedant=출재사, reinsurer=수재사, both=겸업, broker=중개사';

-- =============================================================================
-- 2. rs_contracts — 재보험 특약 핵심 조건 컬럼 추가
--    모두 NULL 허용 (기존 레코드 호환)
-- =============================================================================

-- (A) 거래상대방·중개
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS broker_id            uuid        REFERENCES rs_counterparties(id);

COMMENT ON COLUMN rs_contracts.broker_id IS
    '중개사 counterparty_id. NULL=직접거래(Direct)';

-- (B) 비례재보험 인수 기준
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS underwriting_basis   text
        CHECK (underwriting_basis IS NULL OR underwriting_basis IN ('UY', 'clean_cut'));

COMMENT ON COLUMN rs_contracts.underwriting_basis IS
    'UY=인수년도 기준, clean_cut=회계년도(포트폴리오 이전)';

-- (C) 수수료 체계 (Commission)
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS ceding_commission_rate  numeric(5,4)
        CHECK (ceding_commission_rate IS NULL OR (ceding_commission_rate >= 0 AND ceding_commission_rate <= 1));

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS profit_commission_rate  numeric(5,4)
        CHECK (profit_commission_rate IS NULL OR (profit_commission_rate >= 0 AND profit_commission_rate <= 1));

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS brokerage_rate          numeric(5,4)
        CHECK (brokerage_rate IS NULL OR (brokerage_rate >= 0 AND brokerage_rate <= 1));

COMMENT ON COLUMN rs_contracts.ceding_commission_rate IS
    '출재수수료율 (0.2500 = 25%). Sliding Scale은 별도 jsonb 확장 예정';
COMMENT ON COLUMN rs_contracts.profit_commission_rate IS
    '이익수수료율. 이익 × 이 비율로 산출';
COMMENT ON COLUMN rs_contracts.brokerage_rate IS
    '중개수수료율. broker_id가 있을 때 적용';

-- (D) 적립금 및 이자 (Reserve Deposit)
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS premium_reserve_rate    numeric(5,4)
        CHECK (premium_reserve_rate IS NULL OR (premium_reserve_rate >= 0 AND premium_reserve_rate <= 1));

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS loss_reserve_rate       numeric(5,4)
        CHECK (loss_reserve_rate IS NULL OR (loss_reserve_rate >= 0 AND loss_reserve_rate <= 1));

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS interest_rate           numeric(6,4)
        CHECK (interest_rate IS NULL OR interest_rate >= 0);

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS reserve_release_timing  text
        CHECK (reserve_release_timing IS NULL OR reserve_release_timing IN ('next_period', 'period_after_next'));

COMMENT ON COLUMN rs_contracts.premium_reserve_rate IS
    '보험료 적립금율 (통상 0.35~0.40 = 35~40%)';
COMMENT ON COLUMN rs_contracts.loss_reserve_rate IS
    '손해 적립금율 (미결손해의 100% 등). 0~1 범위';
COMMENT ON COLUMN rs_contracts.interest_rate IS
    '적립금 이자율 연환산 (예: 0.03 = 3%)';
COMMENT ON COLUMN rs_contracts.reserve_release_timing IS
    'next_period=익기 환급, period_after_next=익익기 환급';

-- (E) 정산 조건 (Settlement Terms)
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS payment_due_days        int
        CHECK (payment_due_days IS NULL OR payment_due_days >= 0);

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS confirmation_due_days   int
        CHECK (confirmation_due_days IS NULL OR confirmation_due_days >= 0);

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS offset_allowed          boolean     NOT NULL DEFAULT false;

ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS cash_loss_threshold     numeric(18,2)
        CHECK (cash_loss_threshold IS NULL OR cash_loss_threshold >= 0);

COMMENT ON COLUMN rs_contracts.payment_due_days IS
    '출재사→수재사 송금 기한. SOA 마감 후 N일 (통상 15일)';
COMMENT ON COLUMN rs_contracts.confirmation_due_days IS
    '수재사 확인 기한. SOA 수신 후 N일 (통상 14일)';
COMMENT ON COLUMN rs_contracts.offset_allowed IS
    '동일 상대방 출재/수재 SOA 상계 허용 여부. default=false';
COMMENT ON COLUMN rs_contracts.cash_loss_threshold IS
    'Cash Loss 즉시청구 한도 (이 금액 초과 손해는 정기 SOA 외 별도 청구 가능)';

-- =============================================================================
-- 3. rs_premium_bordereau — 보험료 라인 명세 (설계서 §2.3.1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_premium_bordereau (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 계약 및 거래 연결
    contract_id         uuid        NOT NULL REFERENCES rs_contracts(id),
    transaction_id      uuid        REFERENCES rs_transactions(id), -- 집계 거래 연결 (선택)

    -- 회계 기간
    period_yyyyqn       text        NOT NULL,                       -- 예: 2026Q1, 2026S1, 2026A

    -- 원수계약 정보
    policy_no           text        NOT NULL,                       -- 증권번호 (원수계약 식별자)
    insured_name        text,                                       -- 피보험자

    -- 위험 기간
    risk_period_from    date        NOT NULL,
    risk_period_to      date        NOT NULL,

    -- 보험료 명세
    sum_insured         numeric(18,2) NOT NULL                      -- 보험가입금액
                            CHECK (sum_insured >= 0),
    original_premium    numeric(18,2) NOT NULL                      -- 원보험료
                            CHECK (original_premium >= 0),
    cession_pct         numeric(6,4) NOT NULL                       -- 출재비율 (0.0001~1.0000)
                            CHECK (cession_pct > 0 AND cession_pct <= 1),
    ceded_premium       numeric(18,2) NOT NULL                      -- 출재보험료 = original_premium × cession_pct
                            CHECK (ceded_premium >= 0),

    -- 처리 구분
    entry_type          text        NOT NULL DEFAULT 'new'
                            CHECK (entry_type IN ('new', 'cancel', 'refund', 'adjustment')),

    -- 통화
    currency            char(3)     NOT NULL REFERENCES rs_currencies(code),

    -- 검증 상태
    validation_status   text        NOT NULL DEFAULT 'pending'
                            CHECK (validation_status IN ('pending', 'valid', 'error', 'warning')),
    validation_messages jsonb,                                      -- 행별 오류/경고 메시지 배열

    -- 감사
    created_by          uuid        REFERENCES auth.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    -- 위험기간 논리 검증
    CONSTRAINT chk_pb_risk_period CHECK (risk_period_to >= risk_period_from)
);

COMMENT ON TABLE rs_premium_bordereau IS
    '보험료 라인 명세(Premium Bordereau). 원수계약 증권 단위로 출재 보험료를 기록. 집계 후 rs_transactions에 연결';
COMMENT ON COLUMN rs_premium_bordereau.policy_no IS
    '원수계약 증권번호. 손해 명세(rs_loss_bordereau)와 연결 키';
COMMENT ON COLUMN rs_premium_bordereau.cession_pct IS
    'Quota Share=계약 고정율, Surplus=위험별 계산. 0~1 범위 (예: 0.30 = 30%)';
COMMENT ON COLUMN rs_premium_bordereau.entry_type IS
    'new=신규, cancel=취소, refund=환급, adjustment=조정';
COMMENT ON COLUMN rs_premium_bordereau.validation_status IS
    'pending=미검증, valid=정상, error=오류(저장 차단), warning=경고(저장 가능)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pb_contract_period
    ON rs_premium_bordereau (contract_id, period_yyyyqn);

CREATE INDEX IF NOT EXISTS idx_pb_policy_no
    ON rs_premium_bordereau (policy_no);

CREATE INDEX IF NOT EXISTS idx_pb_transaction
    ON rs_premium_bordereau (transaction_id)
    WHERE transaction_id IS NOT NULL;

-- =============================================================================
-- 4. rs_loss_bordereau — 손해 라인 명세 (설계서 §2.3.2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_loss_bordereau (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 계약 및 거래 연결
    contract_id             uuid        NOT NULL REFERENCES rs_contracts(id),
    transaction_id          uuid        REFERENCES rs_transactions(id), -- 집계 거래 연결 (선택)
    premium_bordereau_id    uuid        REFERENCES rs_premium_bordereau(id), -- 연결 증권 (선택)

    -- 회계 기간
    period_yyyyqn           text        NOT NULL,

    -- 사고 정보
    claim_no                text        NOT NULL,                   -- 사고번호
    loss_date               date        NOT NULL,                   -- 사고 발생일
    report_date             date,                                   -- 사고 보고일

    -- 손해 금액
    paid_amount             numeric(18,2) NOT NULL DEFAULT 0        -- 원수 지급보험금
                                CHECK (paid_amount >= 0),
    os_reserve              numeric(18,2) NOT NULL DEFAULT 0        -- 원수 미결손해(Outstanding Reserve)
                                CHECK (os_reserve >= 0),

    -- 재보험 회수 금액
    cession_pct             numeric(6,4) NOT NULL                   -- 출재비율 (보험료와 동일)
                                CHECK (cession_pct > 0 AND cession_pct <= 1),
    recoverable_amount      numeric(18,2) NOT NULL DEFAULT 0        -- 재보험금 청구액
                                CHECK (recoverable_amount >= 0),

    -- Cash Loss 여부
    is_cash_loss            boolean     NOT NULL DEFAULT false,     -- 한도 초과 시 즉시 청구

    -- 손해 상태
    loss_status             text        NOT NULL DEFAULT 'in_progress'
                                CHECK (loss_status IN ('in_progress', 'paid', 'closed', 'denied')),

    -- 통화
    currency                char(3)     NOT NULL REFERENCES rs_currencies(code),

    -- 검증 상태
    validation_status       text        NOT NULL DEFAULT 'pending'
                                CHECK (validation_status IN ('pending', 'valid', 'error', 'warning')),
    validation_messages     jsonb,

    -- 감사
    created_by              uuid        REFERENCES auth.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_loss_bordereau IS
    '손해 라인 명세(Loss Bordereau). 사고번호 단위로 재보험금 청구액을 기록. is_cash_loss=true이면 Cash Loss 별도 청구 대상';
COMMENT ON COLUMN rs_loss_bordereau.os_reserve IS
    '미결손해액(Outstanding Reserve). paid + os_reserve = 총 손해(Incurred)';
COMMENT ON COLUMN rs_loss_bordereau.recoverable_amount IS
    '재보험금 청구액 = (paid_amount + os_reserve) × cession_pct';
COMMENT ON COLUMN rs_loss_bordereau.is_cash_loss IS
    'true=Cash Loss 즉시청구 대상(계약의 cash_loss_threshold 초과). false=정기 SOA에 포함';
COMMENT ON COLUMN rs_loss_bordereau.loss_status IS
    'in_progress=진행중, paid=지급완료, closed=종결, denied=거절';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lb_contract_period
    ON rs_loss_bordereau (contract_id, period_yyyyqn);

CREATE INDEX IF NOT EXISTS idx_lb_claim_no
    ON rs_loss_bordereau (claim_no);

CREATE INDEX IF NOT EXISTS idx_lb_premium_bordereau
    ON rs_loss_bordereau (premium_bordereau_id)
    WHERE premium_bordereau_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lb_cash_loss
    ON rs_loss_bordereau (contract_id, is_cash_loss)
    WHERE is_cash_loss = true;

-- =============================================================================
-- 5. RLS 정책 — rs_premium_bordereau, rs_loss_bordereau
-- =============================================================================

-- 기존 step2_rls_policies.sql 패턴 동일 적용
-- 브로커 내부 직원: SELECT / INSERT / UPDATE 허용
-- 외부 뷰어: SELECT만 허용 (자신의 소속 계약만)

ALTER TABLE rs_premium_bordereau ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_loss_bordereau ENABLE ROW LEVEL SECURITY;

-- Premium Bordereau RLS
-- CREATE POLICY는 IF NOT EXISTS를 지원하지 않으므로 DROP 후 재생성
DROP POLICY IF EXISTS "broker staff full access on premium_bordereau" ON rs_premium_bordereau;
CREATE POLICY "broker staff full access on premium_bordereau"
    ON rs_premium_bordereau
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles
            WHERE user_id = auth.uid()
              AND role IN ('broker_technician', 'broker_manager', 'admin')
              AND is_active = true
        )
    );

DROP POLICY IF EXISTS "external viewer select on premium_bordereau" ON rs_premium_bordereau;
CREATE POLICY "external viewer select on premium_bordereau"
    ON rs_premium_bordereau
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles up
            JOIN rs_contracts c ON c.id = rs_premium_bordereau.contract_id
            WHERE up.user_id = auth.uid()
              AND up.role IN ('cedant_viewer', 'reinsurer_viewer')
              AND up.is_active = true
              AND (
                  (up.role = 'cedant_viewer'    AND c.cedant_id = up.company_id) OR
                  (up.role = 'reinsurer_viewer' AND EXISTS (
                      SELECT 1 FROM rs_contract_shares cs
                      WHERE cs.contract_id = c.id
                        AND cs.reinsurer_id = up.company_id
                  ))
              )
        )
    );

-- Loss Bordereau RLS (동일 패턴)
DROP POLICY IF EXISTS "broker staff full access on loss_bordereau" ON rs_loss_bordereau;
CREATE POLICY "broker staff full access on loss_bordereau"
    ON rs_loss_bordereau
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles
            WHERE user_id = auth.uid()
              AND role IN ('broker_technician', 'broker_manager', 'admin')
              AND is_active = true
        )
    );

DROP POLICY IF EXISTS "external viewer select on loss_bordereau" ON rs_loss_bordereau;
CREATE POLICY "external viewer select on loss_bordereau"
    ON rs_loss_bordereau
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles up
            JOIN rs_contracts c ON c.id = rs_loss_bordereau.contract_id
            WHERE up.user_id = auth.uid()
              AND up.role IN ('cedant_viewer', 'reinsurer_viewer')
              AND up.is_active = true
              AND (
                  (up.role = 'cedant_viewer'    AND c.cedant_id = up.company_id) OR
                  (up.role = 'reinsurer_viewer' AND EXISTS (
                      SELECT 1 FROM rs_contract_shares cs
                      WHERE cs.contract_id = c.id
                        AND cs.reinsurer_id = up.company_id
                  ))
              )
        )
    );

-- =============================================================================
-- 6. 트리거 — updated_at 자동 갱신
-- =============================================================================

-- fn_set_updated_at 함수가 step1에서 이미 정의되어 있으면 재사용
-- 없는 경우를 대비한 방어적 CREATE OR REPLACE
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pb_updated_at
    BEFORE UPDATE ON rs_premium_bordereau
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_lb_updated_at
    BEFORE UPDATE ON rs_loss_bordereau
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- 완료 확인 쿼리 (실행 후 검증용 — 주석 해제 후 실행)
-- =============================================================================
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'rs_contracts'
--    AND column_name IN (
--        'broker_id','underwriting_basis','ceding_commission_rate',
--        'profit_commission_rate','brokerage_rate','premium_reserve_rate',
--        'loss_reserve_rate','interest_rate','reserve_release_timing',
--        'payment_due_days','confirmation_due_days','offset_allowed','cash_loss_threshold'
--    )
--  ORDER BY column_name;
--
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public'
--    AND table_name IN ('rs_premium_bordereau','rs_loss_bordereau');
