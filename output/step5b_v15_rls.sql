-- =============================================================================
-- step5b_v15_rls.sql
-- 재보험 정청산 관리 시스템 — v1.5 RLS 정책 추가/갱신
-- 생성일: 2026-05-07
-- 전제: step5_v15_enhancements.sql 이미 적용 완료
-- 변경 내용:
--   1. rs_contract_settlement_schedules RLS
--   2. rs_loss_claims RLS
--   3. rs_loss_claim_transactions RLS
--   4. rs_transactions verify/confirm UPDATE 정책
--   5. rs_premium_bordereau / rs_loss_bordereau verify/confirm UPDATE 정책
--   6. rs_account_currents review UPDATE 정책
--   7. rs_settlements remit/verify UPDATE 정책
-- =============================================================================

-- =============================================================================
-- 1. rs_contract_settlement_schedules — RLS 활성화 + 정책
-- =============================================================================
ALTER TABLE rs_contract_settlement_schedules ENABLE ROW LEVEL SECURITY;

-- 브로커 내부 직원(reviewer 포함): 전체 조회
CREATE POLICY "schedules_select_broker"
    ON rs_contract_settlement_schedules FOR SELECT
    USING (fn_is_broker_internal());

-- 출재사 뷰어: 자사 cedant_id가 일치하는 계약의 일정만 조회
CREATE POLICY "schedules_select_cedant_viewer"
    ON rs_contract_settlement_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rs_contracts c
            JOIN rs_user_profiles up ON up.user_id = auth.uid()
            WHERE c.id = rs_contract_settlement_schedules.contract_id
              AND up.role = 'cedant_viewer'
              AND c.cedant_id = up.company_id
        )
    );

-- 수재사 뷰어: 자사가 포함된 계약의 일정만 조회
CREATE POLICY "schedules_select_reinsurer_viewer"
    ON rs_contract_settlement_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rs_contracts c
            JOIN rs_contract_shares cs ON cs.contract_id = c.id
            JOIN rs_user_profiles up ON up.user_id = auth.uid()
            WHERE c.id = rs_contract_settlement_schedules.contract_id
              AND up.role = 'reinsurer_viewer'
              AND cs.reinsurer_id = up.company_id
        )
    );

-- INSERT: broker_technician 이상
CREATE POLICY "schedules_insert_broker"
    ON rs_contract_settlement_schedules FOR INSERT
    WITH CHECK (fn_is_broker_internal());

-- UPDATE: broker_technician 이상
CREATE POLICY "schedules_update_broker"
    ON rs_contract_settlement_schedules FOR UPDATE
    USING (fn_is_broker_internal());

-- DELETE: broker_manager 이상
CREATE POLICY "schedules_delete_manager"
    ON rs_contract_settlement_schedules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles
            WHERE user_id = auth.uid()
              AND role IN ('broker_manager', 'admin')
              AND is_active = true
        )
    );


-- =============================================================================
-- 2. rs_loss_claims — RLS 활성화 + 정책
-- =============================================================================
ALTER TABLE rs_loss_claims ENABLE ROW LEVEL SECURITY;

-- 브로커 내부 직원: 전체 조회
CREATE POLICY "claims_select_broker"
    ON rs_loss_claims FOR SELECT
    USING (fn_is_broker_internal());

-- 출재사 뷰어: 자사가 cedant인 claim만
CREATE POLICY "claims_select_cedant_viewer"
    ON rs_loss_claims FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles up
            WHERE up.user_id = auth.uid()
              AND up.role = 'cedant_viewer'
              AND rs_loss_claims.cedant_id = up.company_id
        )
    );

-- INSERT: 브로커 내부 직원
CREATE POLICY "claims_insert_broker"
    ON rs_loss_claims FOR INSERT
    WITH CHECK (fn_is_broker_internal());

-- UPDATE: 브로커 내부 직원 (status 변경은 reviewer+ 권한, 아래에서 추가)
CREATE POLICY "claims_update_broker"
    ON rs_loss_claims FOR UPDATE
    USING (fn_is_broker_internal());

-- DELETE: admin만
CREATE POLICY "claims_delete_admin"
    ON rs_loss_claims FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM rs_user_profiles
            WHERE user_id = auth.uid()
              AND role = 'admin'
              AND is_active = true
        )
    );


-- =============================================================================
-- 3. rs_loss_claim_transactions — RLS 활성화 + 정책
-- =============================================================================
ALTER TABLE rs_loss_claim_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claim_tx_select_broker"
    ON rs_loss_claim_transactions FOR SELECT
    USING (fn_is_broker_internal());

CREATE POLICY "claim_tx_select_cedant_viewer"
    ON rs_loss_claim_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rs_loss_claims lc
            JOIN rs_user_profiles up ON up.user_id = auth.uid()
            WHERE lc.id = rs_loss_claim_transactions.claim_id
              AND up.role = 'cedant_viewer'
              AND lc.cedant_id = up.company_id
        )
    );

CREATE POLICY "claim_tx_insert_broker"
    ON rs_loss_claim_transactions FOR INSERT
    WITH CHECK (fn_is_broker_internal());

CREATE POLICY "claim_tx_delete_broker"
    ON rs_loss_claim_transactions FOR DELETE
    USING (fn_is_broker_internal());


-- =============================================================================
-- 4. rs_transactions — confirm/verify UPDATE 정책 추가
--    (기존 정책과 충돌하지 않도록 이름 구분)
-- =============================================================================

-- confirm: broker_technician 이상 (잠긴 거래 제외)
CREATE POLICY "tx_confirm_broker"
    ON rs_transactions FOR UPDATE
    USING (
        fn_is_broker_internal()
        AND is_locked = false
        AND is_deleted = false
        AND review_status = 'unconfirmed'
    )
    WITH CHECK (review_status = 'confirmed');

-- verify: reviewer 이상
CREATE POLICY "tx_verify_reviewer"
    ON rs_transactions FOR UPDATE
    USING (
        fn_is_reviewer_or_above()
        AND is_locked = false
        AND is_deleted = false
        AND review_status = 'confirmed'
    )
    WITH CHECK (review_status IN ('verified', 'rejected'));

-- contract_match_status 갱신: broker_technician 이상
CREATE POLICY "tx_match_status_broker"
    ON rs_transactions FOR UPDATE
    USING (fn_is_broker_internal() AND is_deleted = false)
    WITH CHECK (
        contract_match_status IN ('pending', 'matched', 'mismatch', 'waived')
    );


-- =============================================================================
-- 5. rs_premium_bordereau / rs_loss_bordereau — confirm/verify UPDATE 정책
-- =============================================================================

-- premium confirm
CREATE POLICY "premium_bordereau_confirm_broker"
    ON rs_premium_bordereau FOR UPDATE
    USING (
        fn_is_broker_internal()
        AND review_status = 'unconfirmed'
    )
    WITH CHECK (review_status = 'confirmed');

-- premium verify
CREATE POLICY "premium_bordereau_verify_reviewer"
    ON rs_premium_bordereau FOR UPDATE
    USING (
        fn_is_reviewer_or_above()
        AND review_status = 'confirmed'
    )
    WITH CHECK (review_status IN ('verified', 'rejected'));

-- loss confirm
CREATE POLICY "loss_bordereau_confirm_broker"
    ON rs_loss_bordereau FOR UPDATE
    USING (
        fn_is_broker_internal()
        AND review_status = 'unconfirmed'
    )
    WITH CHECK (review_status = 'confirmed');

-- loss verify
CREATE POLICY "loss_bordereau_verify_reviewer"
    ON rs_loss_bordereau FOR UPDATE
    USING (
        fn_is_reviewer_or_above()
        AND review_status = 'confirmed'
    )
    WITH CHECK (review_status IN ('verified', 'rejected'));


-- =============================================================================
-- 6. rs_account_currents — review UPDATE 정책
-- =============================================================================
CREATE POLICY "ac_review_reviewer"
    ON rs_account_currents FOR UPDATE
    USING (
        fn_is_reviewer_or_above()
        AND status = 'approved'
    )
    WITH CHECK (status = 'reviewed');


-- =============================================================================
-- 7. rs_settlements — remit / verify-remit UPDATE 정책
-- =============================================================================

-- remit: broker_technician 이상
CREATE POLICY "settlement_remit_broker"
    ON rs_settlements FOR UPDATE
    USING (
        fn_is_broker_internal()
        AND remit_status = 'pending'
    )
    WITH CHECK (remit_status = 'remitted');

-- verify-remit: reviewer 이상
CREATE POLICY "settlement_verify_remit_reviewer"
    ON rs_settlements FOR UPDATE
    USING (
        fn_is_reviewer_or_above()
        AND remit_status = 'remitted'
    )
    WITH CHECK (remit_status IN ('verified', 'failed'));


-- =============================================================================
-- 8. rs_user_profiles — admin의 INSERT/UPDATE 권한 (reviewer 역할 관리 포함)
--    기존 step2 정책과 충돌하지 않도록 IF NOT EXISTS 패턴으로 추가
-- =============================================================================

-- reviewer 포함 내부 직원 SELECT: 자기 자신 + admin은 모두
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rs_user_profiles'
          AND policyname = 'user_profiles_select_self_or_admin'
    ) THEN
        EXECUTE $pol$
            CREATE POLICY "user_profiles_select_self_or_admin"
                ON rs_user_profiles FOR SELECT
                USING (
                    user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM rs_user_profiles up2
                        WHERE up2.user_id = auth.uid()
                          AND up2.role = 'admin'
                          AND up2.is_active = true
                    )
                );
        $pol$;
    END IF;
END $$;
