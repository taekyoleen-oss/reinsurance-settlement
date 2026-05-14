-- =============================================================================
-- diagnose_rls_recursion.sql
-- 42P17 재귀가 step10 적용 후에도 남아있을 때 원인을 좁히는 진단 쿼리
-- 4개 쿼리를 순서대로 실행하고 결과를 그대로 공유해 주세요.
-- =============================================================================

-- (1) 현재 rs_user_profiles 정책 — step10 후 'user_profiles_select_self' / 'user_profiles_update_self' 두 개만 있어야 함
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'rs_user_profiles'
ORDER BY policyname;

-- (2) RLS 헬퍼 함수의 owner / SECURITY DEFINER / SET 옵션
--     proconfig 컬럼에 'row_security=off' 가 들어있어야 함. owner 가 'postgres' 면 SUPERUSER → bypass 가능
SELECT p.proname,
       r.rolname AS owner,
       r.rolsuper AS owner_is_superuser,
       r.rolbypassrls AS owner_bypass_rls,
       p.prosecdef AS security_definer,
       p.proconfig
FROM pg_proc p
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname IN (
  'fn_is_broker_internal',
  'fn_is_broker_manager_or_admin',
  'fn_is_reviewer_or_above',
  'get_user_role',
  'is_broker_internal',
  'get_user_company_id'
)
ORDER BY p.proname;

-- (3) rs_user_profiles 를 직접 참조(EXISTS / JOIN 등)하는 다른 테이블의 정책 모두 나열
--     아직 남아있는 직접 참조가 있으면 거기서 재귀 가능
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename <> 'rs_user_profiles'
  AND (qual LIKE '%rs_user_profiles%' OR with_check LIKE '%rs_user_profiles%')
ORDER BY tablename, policyname;

-- (4) 함수 자체를 직접 호출했을 때 재귀가 나는지 확인 (정상이면 true/false 반환)
--     실패하면 함수 단독으로 RLS 우회가 안 되는 상태
SELECT fn_is_broker_internal()           AS fn_is_broker_internal,
       fn_is_broker_manager_or_admin()   AS fn_is_broker_manager_or_admin,
       get_user_role()                    AS user_role;
