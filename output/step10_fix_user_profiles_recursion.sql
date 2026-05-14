-- =============================================================================
-- step10_fix_user_profiles_recursion.sql
-- 증상: 42P17 "infinite recursion detected in policy for relation rs_user_profiles"
-- 원인: rs_user_profiles RLS 정책이 fn_is_broker_*/get_user_role() 호출
--       → 함수가 다시 rs_user_profiles 를 SELECT → RLS 재평가 → 무한 재귀
--       (SECURITY DEFINER 가 BYPASSRLS 권한 없는 owner 면 RLS 를 우회하지 못함)
-- 조치:
--   (A) rs_user_profiles 정책을 자기 참조 없는 단순 정책으로 교체
--       (본인 SELECT/UPDATE 만 허용. 관리자 작업은 service_role 키로)
--   (B) RLS 헬퍼 함수에 SET row_security = off 명시 → owner 권한 무관하게 RLS 우회
-- 멱등성: 모두 DROP IF EXISTS / CREATE OR REPLACE
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- (A) rs_user_profiles 자기 참조 정책 제거 후 단순 정책만 유지
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_profiles_select_self"     ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_manager"  ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_admin"    ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin"    ON rs_user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin"    ON rs_user_profiles;

-- 본인 행만 SELECT (재귀 없음)
CREATE POLICY "user_profiles_select_self"
    ON rs_user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 본인 행만 UPDATE (full_name 등 비-role 필드. role 변경은 service_role 만)
CREATE POLICY "user_profiles_update_self"
    ON rs_user_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- INSERT / DELETE / 다른 사용자 관리 → service_role (admin API 라우트가 사용) 로 위임
-- service_role 은 RLS 를 자동 우회하므로 별도 ALL 정책 불필요

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) RLS 헬퍼 함수: SET row_security = off 명시로 재귀 차단
-- ─────────────────────────────────────────────────────────────────────────────

-- get_user_role()
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT role FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

-- is_broker_internal() (구 명칭)
CREATE OR REPLACE FUNCTION public.is_broker_internal()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles
        WHERE user_id = auth.uid()
          AND role IN ('broker_technician', 'broker_manager', 'admin')
    )
$$;

-- get_user_company_id()
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT company_id FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

-- fn_is_broker_internal() (step5 신규 명칭, reviewer 포함)
CREATE OR REPLACE FUNCTION public.fn_is_broker_internal()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles
        WHERE user_id = auth.uid()
          AND role IN ('broker_technician', 'broker_manager', 'reviewer', 'admin')
          AND is_active = true
    )
$$;

-- fn_is_broker_manager_or_admin() (step6 추가)
CREATE OR REPLACE FUNCTION public.fn_is_broker_manager_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('broker_manager', 'admin')
    )
$$;

-- fn_is_reviewer_or_above() (step5 추가, 존재 시에만 의미 있음)
CREATE OR REPLACE FUNCTION public.fn_is_reviewer_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM rs_user_profiles
        WHERE user_id = auth.uid()
          AND role IN ('reviewer', 'broker_manager', 'admin')
          AND is_active = true
    )
$$;

-- 권한 (authenticated 가 호출 가능해야 RLS 정책에서 사용 가능)
GRANT EXECUTE ON FUNCTION public.get_user_role()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_broker_internal()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_broker_internal()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_broker_manager_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_reviewer_or_above()    TO authenticated;

-- =============================================================================
SELECT 'step10 user_profiles RLS recursion fix applied' AS result;
