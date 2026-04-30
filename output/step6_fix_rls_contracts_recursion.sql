-- =============================================================================
-- step6_fix_rls_contracts_recursion.sql
-- 증상: "infinite recursion detected in policy for relation rs_contracts"
-- 원인: rs_contracts(수재 정책) ↔ rs_contract_shares(출재 정책) 상호 EXISTS
--       + rs_user_profiles 관리자 SELECT가 get_user_role() 재진입 가능
-- 조치: SECURITY DEFINER 헬퍼로 RLS 우회 조회, 정책 재생성
-- 전제: step2_rls_policies.sql 적용된 DB
-- =============================================================================

-- ── 계약의 출재사 ID (RLS 우회 — 정책에서 상호 참조 방지)
CREATE OR REPLACE FUNCTION public.fn_contract_cedant_id(p_contract_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT c.cedant_id
    FROM rs_contracts c
    WHERE c.id = p_contract_id
    LIMIT 1
$$;

COMMENT ON FUNCTION public.fn_contract_cedant_id(uuid) IS
    '계약 출재사 ID 조회. RLS 순환 방지용 SECURITY DEFINER.';

-- ── 계약에 특정 수재사 지분 존재 여부 (RLS 우회)
CREATE OR REPLACE FUNCTION public.fn_contract_has_reinsurer(
    p_contract_id uuid,
    p_reinsurer_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM rs_contract_shares cs
        WHERE cs.contract_id = p_contract_id
          AND cs.reinsurer_id = p_reinsurer_id
    )
$$;

COMMENT ON FUNCTION public.fn_contract_has_reinsurer(uuid, uuid) IS
    '계약+수재사 지분 존재 여부. contracts_select_reinsurer RLS 순환 방지.';

-- ── 브로커 관리자/어드민 여부 (user_profiles 정책 순환 방지)
CREATE OR REPLACE FUNCTION public.fn_is_broker_manager_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM rs_user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('broker_manager', 'admin')
    )
$$;

COMMENT ON FUNCTION public.fn_is_broker_manager_or_admin() IS
    'broker_manager 또는 admin 여부. user_profiles SELECT 정책에서 get_user_role() 재귀 방지.';

GRANT EXECUTE ON FUNCTION public.fn_contract_cedant_id(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_contract_has_reinsurer(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_broker_manager_or_admin()           TO authenticated;

-- ── rs_contract_shares: 출재사 뷰어 정책 교체
DROP POLICY IF EXISTS "contract_shares_select_cedant" ON rs_contract_shares;

CREATE POLICY "contract_shares_select_cedant"
    ON rs_contract_shares
    FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'cedant_viewer'
        AND fn_contract_cedant_id(rs_contract_shares.contract_id) = get_user_company_id()
    );

-- ── rs_contracts: 수재사 뷰어 정책 교체
DROP POLICY IF EXISTS "contracts_select_reinsurer" ON rs_contracts;

CREATE POLICY "contracts_select_reinsurer"
    ON rs_contracts
    FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'reinsurer_viewer'
        AND fn_contract_has_reinsurer(rs_contracts.id, get_user_company_id())
    );

-- ── rs_user_profiles: 관리자 전체 조회 정책 교체
DROP POLICY IF EXISTS "user_profiles_select_manager" ON rs_user_profiles;

CREATE POLICY "user_profiles_select_manager"
    ON rs_user_profiles
    FOR SELECT
    TO authenticated
    USING (fn_is_broker_manager_or_admin());

-- =============================================================================
SELECT 'step6 RLS recursion fix applied' AS result;
