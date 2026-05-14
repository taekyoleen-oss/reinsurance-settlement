-- =============================================================================
-- step12_kill_all_recursive_policies.sql
-- 진짜 재귀 원인:
--   step5b 가 'user_profiles_select_self_or_admin' 정책에서
--   rs_user_profiles 를 직접 SELECT → 본인 정책 평가 중 자기 자신 재귀 → 42P17
--   (step10 이 이 이름은 DROP 하지 않아 살아남음)
--
-- 추가로 step4(bordereau) / step5b(claims, claim_tx, schedules cedant·reinsurer 정책)
-- 도 EXISTS (SELECT 1 FROM rs_user_profiles ...) 직접 쿼리로 재귀 위험.
--
-- 조치:
--   (A) rs_user_profiles 의 모든 자기참조 정책 제거 → 본인행만 SELECT/UPDATE
--   (B) bordereau / claims / claim_tx / schedules 의 외부뷰어 정책 정리 →
--       broker FOR ALL 단일 정책으로 통합 (fn_is_broker_internal 호출)
--   (C) PostgREST schema cache reload
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- (A) rs_user_profiles — 모든 자기참조 정책 제거
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_profiles_select_self"           ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_manager"        ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_self_or_admin"  ON rs_user_profiles;  -- ← step5b 잔존, 진짜 재귀 원인
DROP POLICY IF EXISTS "user_profiles_insert_admin"          ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin"          ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_self"           ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin"          ON rs_user_profiles;

-- 본인 행만 SELECT (재귀 없음)
CREATE POLICY "user_profiles_select_self"
    ON rs_user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 본인 행만 UPDATE
CREATE POLICY "user_profiles_update_self"
    ON rs_user_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- INSERT/DELETE/role 변경/타사용자 관리 → service_role 위임 (admin API 가 사용)

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) rs_premium_bordereau — broker FOR ALL 단일 정책으로 통합
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "broker staff full access on premium_bordereau" ON rs_premium_bordereau;
DROP POLICY IF EXISTS "external viewer select on premium_bordereau"   ON rs_premium_bordereau;
DROP POLICY IF EXISTS "premium_bordereau_confirm_broker"              ON rs_premium_bordereau;
DROP POLICY IF EXISTS "premium_bordereau_verify_reviewer"             ON rs_premium_bordereau;

CREATE POLICY "premium_bordereau_broker_all"
    ON rs_premium_bordereau
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (C) rs_loss_bordereau — 동일 패턴
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "broker staff full access on loss_bordereau" ON rs_loss_bordereau;
DROP POLICY IF EXISTS "external viewer select on loss_bordereau"   ON rs_loss_bordereau;
DROP POLICY IF EXISTS "loss_bordereau_confirm_broker"              ON rs_loss_bordereau;
DROP POLICY IF EXISTS "loss_bordereau_verify_reviewer"             ON rs_loss_bordereau;

CREATE POLICY "loss_bordereau_broker_all"
    ON rs_loss_bordereau
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (D) rs_loss_claims
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "claims_select_broker"        ON rs_loss_claims;
DROP POLICY IF EXISTS "claims_select_cedant_viewer" ON rs_loss_claims;
DROP POLICY IF EXISTS "claims_insert_broker"        ON rs_loss_claims;
DROP POLICY IF EXISTS "claims_update_broker"        ON rs_loss_claims;
DROP POLICY IF EXISTS "claims_delete_admin"         ON rs_loss_claims;

CREATE POLICY "claims_broker_all"
    ON rs_loss_claims
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (E) rs_loss_claim_transactions
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "claim_tx_select_broker"        ON rs_loss_claim_transactions;
DROP POLICY IF EXISTS "claim_tx_select_cedant_viewer" ON rs_loss_claim_transactions;
DROP POLICY IF EXISTS "claim_tx_insert_broker"        ON rs_loss_claim_transactions;
DROP POLICY IF EXISTS "claim_tx_delete_broker"        ON rs_loss_claim_transactions;

CREATE POLICY "claim_tx_broker_all"
    ON rs_loss_claim_transactions
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (F) PostgREST schema cache reload
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =============================================================================
SELECT 'step12 — all recursive policies replaced with fn_is_broker_internal()' AS result;
