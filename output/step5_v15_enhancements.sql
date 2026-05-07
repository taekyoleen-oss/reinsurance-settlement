-- =============================================================================
-- step5_v15_enhancements.sql
-- 재보험 정청산 관리 시스템 — v1.5 기능 보강 마이그레이션
-- 생성일: 2026-05-07
-- 전제: step1_schema.sql(v1.3) + step4_bordereau_and_contract_terms.sql(v1.4) 이미 적용 완료
-- 변경 내용:
--   1. rs_user_profiles — reviewer 역할 신설
--   2. rs_contracts — 항목별 정산주기 컬럼 추가 (premium/loss/commission)
--   3. rs_contract_settlement_schedules — 정산주기 인스턴스 테이블 신설
--   4. rs_premium_bordereau / rs_loss_bordereau — settlement_schedule_id FK 추가
--   5. rs_transactions — 확정·검수 메타 컬럼 추가
--   6. rs_premium_bordereau / rs_loss_bordereau — 확정·검수 메타 컬럼 추가
--   7. rs_account_currents — reviewed·issued_by·acknowledged 메타 컬럼 추가
--   8. rs_settlements — 송금 완료·검수 메타 컬럼 추가
--   9. rs_loss_claims — 보험금 청구 헤더 테이블 신설
--  10. rs_loss_claim_transactions — claim ↔ 거래 매핑 테이블 신설
--  11. 인덱스, 트리거, 채번 Sequence 추가
-- =============================================================================

-- =============================================================================
-- 1. rs_user_profiles — reviewer 역할 신설
-- =============================================================================
ALTER TABLE rs_user_profiles
    DROP CONSTRAINT IF EXISTS rs_user_profiles_role_check;

ALTER TABLE rs_user_profiles
    ADD CONSTRAINT rs_user_profiles_role_check
    CHECK (role IN (
        'broker_technician',
        'broker_manager',
        'reviewer',
        'cedant_viewer',
        'reinsurer_viewer',
        'admin'
    ));

COMMENT ON COLUMN rs_user_profiles.role IS
    'broker_technician=브로커실무자, broker_manager=브로커관리자, reviewer=검수자, '
    'cedant_viewer=출재사뷰어, reinsurer_viewer=수재사뷰어, admin=시스템관리자';

-- reviewer 포함 내부 직원 체크 함수 (기존 fn_is_broker_internal 대체)
CREATE OR REPLACE FUNCTION fn_is_broker_internal() RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles
        WHERE user_id = auth.uid()
          AND role IN ('broker_technician', 'broker_manager', 'reviewer', 'admin')
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- reviewer 이상 권한 체크 함수
CREATE OR REPLACE FUNCTION fn_is_reviewer_or_above() RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles
        WHERE user_id = auth.uid()
          AND role IN ('reviewer', 'broker_manager', 'admin')
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =============================================================================
-- 2. rs_contracts — 항목별 정산주기 컬럼 추가
-- =============================================================================
ALTER TABLE rs_contracts
    ADD COLUMN IF NOT EXISTS premium_settlement_period text DEFAULT 'quarterly'
        CHECK (premium_settlement_period IS NULL OR
               premium_settlement_period IN ('quarterly', 'semiannual', 'annual', 'adhoc')),
    ADD COLUMN IF NOT EXISTS loss_settlement_period text DEFAULT 'adhoc'
        CHECK (loss_settlement_period IS NULL OR
               loss_settlement_period IN ('quarterly', 'semiannual', 'annual', 'adhoc')),
    ADD COLUMN IF NOT EXISTS commission_settlement_period text DEFAULT 'quarterly'
        CHECK (commission_settlement_period IS NULL OR
               commission_settlement_period IN ('quarterly', 'semiannual', 'annual', 'adhoc')),
    ADD COLUMN IF NOT EXISTS verifier_user_id uuid REFERENCES auth.users(id);

-- 기존 레코드: settlement_period 값을 premium/commission에 복사, loss는 adhoc
UPDATE rs_contracts
SET
    premium_settlement_period    = settlement_period,
    loss_settlement_period       = 'adhoc',
    commission_settlement_period = settlement_period
WHERE premium_settlement_period IS NULL;

COMMENT ON COLUMN rs_contracts.premium_settlement_period    IS '보험료 정산 주기';
COMMENT ON COLUMN rs_contracts.loss_settlement_period       IS '보험금 정산 주기';
COMMENT ON COLUMN rs_contracts.commission_settlement_period IS '수수료 정산 주기';
COMMENT ON COLUMN rs_contracts.verifier_user_id             IS '계약 지정 검수자 (reviewer 역할). NULL=역할만으로 검수 권한 부여';


-- =============================================================================
-- 3. rs_contract_settlement_schedules — 정산주기 인스턴스 테이블 신설
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_contract_settlement_schedules (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     uuid        NOT NULL REFERENCES rs_contracts(id) ON DELETE CASCADE,
    schedule_type   text        NOT NULL
                        CHECK (schedule_type IN ('premium', 'loss', 'commission')),
    period_label    text        NOT NULL,        -- '2026Q1', '2026H1', '2026', 'AD-2026-04-15'
    period_from     date        NOT NULL,
    period_to       date        NOT NULL,
    expected_amount numeric(18,2),              -- 예상 금액 (옵션)
    currency_code   char(3)     REFERENCES rs_currencies(code),
    status          text        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'closed', 'cancelled')),
    notes           text,
    created_by      uuid        REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (contract_id, schedule_type, period_label)
);

COMMENT ON TABLE  rs_contract_settlement_schedules IS '계약별 항목 유형(보험료/손해/수수료)별 정산주기 인스턴스. 명세·거래와 연결됨';
COMMENT ON COLUMN rs_contract_settlement_schedules.period_label IS
    '주기 레이블: quarterly=2026Q1, semiannual=2026H1, annual=2026, adhoc=AD-YYYY-MM-DD';
COMMENT ON COLUMN rs_contract_settlement_schedules.expected_amount IS '해당 주기의 예상(계약) 금액. 실적과 비교하여 일치 여부 확인에 사용';

CREATE INDEX IF NOT EXISTS idx_schedule_contract
    ON rs_contract_settlement_schedules (contract_id, schedule_type);
CREATE INDEX IF NOT EXISTS idx_schedule_period
    ON rs_contract_settlement_schedules (period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_schedule_status
    ON rs_contract_settlement_schedules (status)
    WHERE status != 'closed';


-- =============================================================================
-- 4. rs_premium_bordereau / rs_loss_bordereau — settlement_schedule_id FK 추가
-- =============================================================================
ALTER TABLE rs_premium_bordereau
    ADD COLUMN IF NOT EXISTS settlement_schedule_id uuid
        REFERENCES rs_contract_settlement_schedules(id) ON DELETE SET NULL;

ALTER TABLE rs_loss_bordereau
    ADD COLUMN IF NOT EXISTS settlement_schedule_id uuid
        REFERENCES rs_contract_settlement_schedules(id) ON DELETE SET NULL;

COMMENT ON COLUMN rs_premium_bordereau.settlement_schedule_id IS '연결된 정산주기 인스턴스. 명세 입력 시 해당 주기에 자동 귀속';
COMMENT ON COLUMN rs_loss_bordereau.settlement_schedule_id    IS '연결된 정산주기 인스턴스';

CREATE INDEX IF NOT EXISTS idx_premium_bordereau_schedule
    ON rs_premium_bordereau (settlement_schedule_id)
    WHERE settlement_schedule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loss_bordereau_schedule
    ON rs_loss_bordereau (settlement_schedule_id)
    WHERE settlement_schedule_id IS NOT NULL;


-- =============================================================================
-- 5. rs_transactions — 확정·검수 메타 컬럼 추가
-- =============================================================================
ALTER TABLE rs_transactions
    ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'unconfirmed'
        CHECK (review_status IN ('unconfirmed', 'confirmed', 'verified', 'rejected')),
    ADD COLUMN IF NOT EXISTS contract_match_status text DEFAULT 'pending'
        CHECK (contract_match_status IN ('pending', 'matched', 'mismatch', 'waived')),
    ADD COLUMN IF NOT EXISTS settlement_schedule_id uuid
        REFERENCES rs_contract_settlement_schedules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confirmed_by    uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS confirmed_at    timestamptz,
    ADD COLUMN IF NOT EXISTS confirmer_name  text,
    ADD COLUMN IF NOT EXISTS confirmer_email text,
    ADD COLUMN IF NOT EXISTS verified_by     uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS verified_at     timestamptz,
    ADD COLUMN IF NOT EXISTS verifier_name   text,
    ADD COLUMN IF NOT EXISTS verifier_email  text,
    ADD COLUMN IF NOT EXISTS review_notes    text;

COMMENT ON COLUMN rs_transactions.review_status IS
    'unconfirmed=미확정, confirmed=담당자확정, verified=검수완료, rejected=반려';
COMMENT ON COLUMN rs_transactions.contract_match_status IS
    'pending=미확인, matched=계약일치, mismatch=불일치, waived=면제';
COMMENT ON COLUMN rs_transactions.confirmer_name  IS '확정 시점 담당자 이름 스냅샷 (프로필 변경에 독립)';
COMMENT ON COLUMN rs_transactions.confirmer_email IS '확정 시점 담당자 이메일 스냅샷';
COMMENT ON COLUMN rs_transactions.verifier_name   IS '검수 시점 검수자 이름 스냅샷';
COMMENT ON COLUMN rs_transactions.verifier_email  IS '검수 시점 검수자 이메일 스냅샷';

CREATE INDEX IF NOT EXISTS idx_tx_review_status
    ON rs_transactions (review_status)
    WHERE review_status != 'verified' AND is_deleted = false;


-- =============================================================================
-- 6. rs_premium_bordereau / rs_loss_bordereau — 확정·검수 메타 컬럼 추가
-- =============================================================================
ALTER TABLE rs_premium_bordereau
    ADD COLUMN IF NOT EXISTS review_status   text DEFAULT 'unconfirmed'
        CHECK (review_status IN ('unconfirmed', 'confirmed', 'verified', 'rejected')),
    ADD COLUMN IF NOT EXISTS confirmed_by    uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS confirmed_at    timestamptz,
    ADD COLUMN IF NOT EXISTS confirmer_name  text,
    ADD COLUMN IF NOT EXISTS confirmer_email text,
    ADD COLUMN IF NOT EXISTS verified_by     uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS verified_at     timestamptz,
    ADD COLUMN IF NOT EXISTS verifier_name   text,
    ADD COLUMN IF NOT EXISTS verifier_email  text,
    ADD COLUMN IF NOT EXISTS review_notes    text;

ALTER TABLE rs_loss_bordereau
    ADD COLUMN IF NOT EXISTS review_status   text DEFAULT 'unconfirmed'
        CHECK (review_status IN ('unconfirmed', 'confirmed', 'verified', 'rejected')),
    ADD COLUMN IF NOT EXISTS confirmed_by    uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS confirmed_at    timestamptz,
    ADD COLUMN IF NOT EXISTS confirmer_name  text,
    ADD COLUMN IF NOT EXISTS confirmer_email text,
    ADD COLUMN IF NOT EXISTS verified_by     uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS verified_at     timestamptz,
    ADD COLUMN IF NOT EXISTS verifier_name   text,
    ADD COLUMN IF NOT EXISTS verifier_email  text,
    ADD COLUMN IF NOT EXISTS review_notes    text;

COMMENT ON COLUMN rs_premium_bordereau.review_status IS 'unconfirmed=미확정, confirmed=담당자확정, verified=검수완료, rejected=반려';
COMMENT ON COLUMN rs_loss_bordereau.review_status    IS 'unconfirmed=미확정, confirmed=담당자확정, verified=검수완료, rejected=반려';


-- =============================================================================
-- 7. rs_account_currents — 검수·발행자·acknowledged 메타 컬럼 추가
-- =============================================================================
ALTER TABLE rs_account_currents
    ADD COLUMN IF NOT EXISTS reviewed_by       uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz,
    ADD COLUMN IF NOT EXISTS reviewer_name     text,
    ADD COLUMN IF NOT EXISTS reviewer_email    text,
    ADD COLUMN IF NOT EXISTS issued_by         uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS acknowledged_by   uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS acknowledged_at   timestamptz;

-- status에 'reviewed' 단계 추가
ALTER TABLE rs_account_currents
    DROP CONSTRAINT IF EXISTS rs_account_currents_status_check;
ALTER TABLE rs_account_currents
    ADD CONSTRAINT rs_account_currents_status_check
    CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'reviewed',
        'issued', 'acknowledged', 'disputed', 'cancelled'
    ));

COMMENT ON COLUMN rs_account_currents.reviewed_by    IS '검수자(reviewer/manager/admin) 스냅샷 — approved→reviewed 전환 시 기록';
COMMENT ON COLUMN rs_account_currents.issued_by      IS 'issued 전환 담당자';
COMMENT ON COLUMN rs_account_currents.acknowledged_at IS '외부 뷰어(상대방) Acknowledge 시각';


-- =============================================================================
-- 8. rs_settlements — 송금 완료·검수 메타 컬럼 추가
-- =============================================================================
ALTER TABLE rs_settlements
    ADD COLUMN IF NOT EXISTS remit_status    text NOT NULL DEFAULT 'pending'
        CHECK (remit_status IN ('pending', 'remitted', 'verified', 'failed')),
    ADD COLUMN IF NOT EXISTS remitted_by     uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS remitted_at     timestamptz,
    ADD COLUMN IF NOT EXISTS remitter_name   text,
    ADD COLUMN IF NOT EXISTS remitter_email  text,
    ADD COLUMN IF NOT EXISTS reviewed_by     uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at     timestamptz,
    ADD COLUMN IF NOT EXISTS reviewer_name   text,
    ADD COLUMN IF NOT EXISTS reviewer_email  text;

COMMENT ON COLUMN rs_settlements.remit_status   IS 'pending=미송금, remitted=송금완료, verified=검수완료, failed=실패';
COMMENT ON COLUMN rs_settlements.remitter_name  IS '송금 완료 처리 담당자 이름 스냅샷';
COMMENT ON COLUMN rs_settlements.reviewer_name  IS '송금 검수자 이름 스냅샷';

CREATE INDEX IF NOT EXISTS idx_settlements_remit_status
    ON rs_settlements (remit_status)
    WHERE remit_status != 'verified';


-- =============================================================================
-- 9. rs_loss_claims — 보험금 청구 헤더 테이블 신설
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_loss_claims (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_no                text        UNIQUE,             -- 'LCL-YYYY-NNNNN' 자동 채번
    contract_id             uuid        NOT NULL REFERENCES rs_contracts(id),
    cedant_id               uuid        NOT NULL REFERENCES rs_counterparties(id),
    loss_event_date         date        NOT NULL,
    reported_date           date,
    loss_reference          text,                           -- 외부 청구 참조번호
    total_claimed_amount    numeric(18,2) NOT NULL
                                CHECK (total_claimed_amount > 0),
    currency_code           char(3)     NOT NULL REFERENCES rs_currencies(code),
    status                  text        NOT NULL DEFAULT 'open'
                                CHECK (status IN (
                                    'open', 'collecting', 'ready_to_pay',
                                    'paying', 'closed', 'disputed', 'cancelled'
                                )),
    description             text,
    -- 진행률 캐시 (트리거로 자동 갱신)
    collected_amount        numeric(18,2) NOT NULL DEFAULT 0,  -- 수재사로부터 수금 합계
    paid_amount             numeric(18,2) NOT NULL DEFAULT 0,  -- 출재사 지급 합계
    created_by              uuid        REFERENCES auth.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  rs_loss_claims IS '보험금 청구 헤더. 여러 수재사 receipt와 출재사 payment를 단일 사고건으로 묶어 잔액·진행률 추적';
COMMENT ON COLUMN rs_loss_claims.collected_amount IS '연결된 receipt_from_reinsurer 거래 합계. 트리거로 자동 갱신';
COMMENT ON COLUMN rs_loss_claims.paid_amount      IS '연결된 payment_to_cedant 거래 합계. 트리거로 자동 갱신';
COMMENT ON COLUMN rs_loss_claims.status IS
    'open=접수, collecting=수금중, ready_to_pay=지급준비, paying=지급중, closed=완료, disputed=분쟁, cancelled=취소';

CREATE INDEX IF NOT EXISTS idx_loss_claims_contract
    ON rs_loss_claims (contract_id);
CREATE INDEX IF NOT EXISTS idx_loss_claims_cedant
    ON rs_loss_claims (cedant_id);
CREATE INDEX IF NOT EXISTS idx_loss_claims_status
    ON rs_loss_claims (status)
    WHERE status NOT IN ('closed', 'cancelled');


-- =============================================================================
-- 10. rs_loss_claim_transactions — claim ↔ 거래 매핑 테이블 신설
-- =============================================================================
CREATE TABLE IF NOT EXISTS rs_loss_claim_transactions (
    claim_id        uuid    NOT NULL REFERENCES rs_loss_claims(id) ON DELETE CASCADE,
    transaction_id  uuid    NOT NULL REFERENCES rs_transactions(id) ON DELETE CASCADE,
    role            text    NOT NULL
                        CHECK (role IN (
                            'receipt_from_reinsurer',   -- 수재사로부터 수금
                            'payment_to_cedant',        -- 출재사로 지급
                            'recovery',                 -- 회수금
                            'adjustment'               -- 조정
                        )),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (claim_id, transaction_id)
);

COMMENT ON TABLE  rs_loss_claim_transactions IS 'claim과 거래(transaction)의 N:N 매핑. 역할별로 수금/지급/회수를 구분';
COMMENT ON COLUMN rs_loss_claim_transactions.role IS
    'receipt_from_reinsurer=수재사수금, payment_to_cedant=출재사지급, recovery=회수, adjustment=조정';

CREATE INDEX IF NOT EXISTS idx_claim_tx_transaction
    ON rs_loss_claim_transactions (transaction_id);


-- =============================================================================
-- 11. Sequence — claim_no 자동 채번
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_claim_no START 1;

CREATE OR REPLACE FUNCTION fn_set_claim_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claim_no IS NULL THEN
        NEW.claim_no := 'LCL-' || to_char(NOW(), 'YYYY') || '-'
                        || lpad(nextval('seq_claim_no')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claim_no ON rs_loss_claims;
CREATE TRIGGER trg_claim_no
    BEFORE INSERT ON rs_loss_claims
    FOR EACH ROW EXECUTE FUNCTION fn_set_claim_no();


-- =============================================================================
-- 12. 트리거 — claim 진행률 캐시 자동 갱신
--     rs_loss_claim_transactions INSERT/DELETE 시 collected/paid 재계산
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_update_claim_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_claim_id uuid;
    v_collected numeric(18,2);
    v_paid      numeric(18,2);
BEGIN
    -- INSERT: NEW.claim_id, DELETE: OLD.claim_id
    IF TG_OP = 'DELETE' THEN
        v_claim_id := OLD.claim_id;
    ELSE
        v_claim_id := NEW.claim_id;
    END IF;

    SELECT
        COALESCE(SUM(CASE WHEN lct.role = 'receipt_from_reinsurer'
                     THEN t.amount_original ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN lct.role = 'payment_to_cedant'
                     THEN t.amount_original ELSE 0 END), 0)
    INTO v_collected, v_paid
    FROM rs_loss_claim_transactions lct
    JOIN rs_transactions t ON t.id = lct.transaction_id
    WHERE lct.claim_id = v_claim_id
      AND t.is_deleted = false;

    UPDATE rs_loss_claims
    SET
        collected_amount = v_collected,
        paid_amount      = v_paid,
        updated_at       = now()
    WHERE id = v_claim_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claim_balance ON rs_loss_claim_transactions;
CREATE TRIGGER trg_claim_balance
    AFTER INSERT OR DELETE ON rs_loss_claim_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_update_claim_balance();


-- =============================================================================
-- 13. 트리거 — rs_contract_settlement_schedules updated_at 자동 갱신
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedules_updated_at ON rs_contract_settlement_schedules;
CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON rs_contract_settlement_schedules
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_loss_claims_updated_at ON rs_loss_claims;
CREATE TRIGGER trg_loss_claims_updated_at
    BEFORE UPDATE ON rs_loss_claims
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
