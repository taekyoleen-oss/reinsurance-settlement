-- =============================================================================
-- step11_force_reload_and_disable_recursive_paths.sql
-- step10 적용 후에도 42P17 가 지속될 때 사용하는 추가 fix.
--
-- 가설:
--  (1) PostgREST 가 이전 정책 plan 을 캐시 → schema reload 필요
--  (2) rs_contract_settlement_schedules 의 cedant_viewer / reinsurer_viewer 정책이
--      rs_user_profiles 를 JOIN → 다른 테이블의 RLS 평가 중 재귀 발생
--      (브로커가 보는 화면이라면 이 두 정책은 평가 자체가 비효율 + 재귀 위험)
--  (3) row_security=off 설정이 함수 owner 권한 부족으로 무시되는 환경
--
-- 조치:
--  (A) schedules 의 외부뷰어 SELECT 정책 삭제 후 단일 헬퍼 기반 정책으로 통합
--  (B) PostgREST schema 캐시 reload 신호
--
-- 외부 뷰어(cedant/reinsurer) 화면이 schedules 를 봐야 한다면 이후 별도 v 뷰 + grant
-- 로 다시 노출하는 것이 안전.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- (A) rs_contract_settlement_schedules 정책 통합
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "schedules_select_broker"           ON rs_contract_settlement_schedules;
DROP POLICY IF EXISTS "schedules_select_cedant_viewer"    ON rs_contract_settlement_schedules;
DROP POLICY IF EXISTS "schedules_select_reinsurer_viewer" ON rs_contract_settlement_schedules;
DROP POLICY IF EXISTS "schedules_insert_broker"           ON rs_contract_settlement_schedules;
DROP POLICY IF EXISTS "schedules_update_broker"           ON rs_contract_settlement_schedules;
DROP POLICY IF EXISTS "schedules_delete_manager"          ON rs_contract_settlement_schedules;

-- 브로커 내부 직원만 SELECT/INSERT/UPDATE/DELETE — fn_is_broker_internal() 단일 호출로 재귀 면 최소화
CREATE POLICY "schedules_broker_all"
    ON rs_contract_settlement_schedules
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) rs_premium_receipts 정책도 동일하게 정리 (step8 의 EXISTS 직접쿼리 → 헬퍼 함수로)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "broker_full_access_premium_receipts" ON rs_premium_receipts;
DROP POLICY IF EXISTS "external_read_premium_receipts"      ON rs_premium_receipts;

CREATE POLICY "premium_receipts_broker_all"
    ON rs_premium_receipts
    FOR ALL
    TO authenticated
    USING (fn_is_broker_internal())
    WITH CHECK (fn_is_broker_internal());

-- ─────────────────────────────────────────────────────────────────────────────
-- (C) PostgREST schema 캐시 reload — 이전 정책 plan 강제 무효화
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =============================================================================
SELECT 'step11 schedules/receipts policy consolidation + pgrst reload' AS result;
