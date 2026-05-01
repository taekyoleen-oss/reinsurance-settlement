# L5: JWT Custom Claims 설정 가이드

현재 구현은 매 API 요청마다 `rs_user_profiles` 테이블에서 사용자 역할을 조회합니다.
JWT custom claims를 사용하면 이 DB 라운드트립을 제거할 수 있습니다.

## 1. Supabase Auth Hook 설정

Supabase 대시보드 → Authentication → Hooks에서 `Custom Access Token` Hook을 활성화합니다.

### Hook SQL 함수

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM rs_user_profiles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'cedant_viewer')));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

## 2. lib/api/auth.ts 수정

Hook 적용 후 `requireBrokerRole` 등 헬퍼에서 DB 조회 대신 JWT claims를 읽도록 변경합니다:

```typescript
// Before: DB 조회
const { data: profile } = await supabase
  .from('rs_user_profiles')
  .select('role')
  .eq('user_id', user.id)
  .single()

// After: JWT claims 직접 읽기
const { data: { session } } = await supabase.auth.getSession()
const userRole = session?.access_token
  ? JSON.parse(atob(session.access_token.split('.')[1])).user_role
  : null
```

## 주의 사항

- Hook 함수는 **Supabase Auth 내부에서 실행**되므로 일반 `supabase` 클라이언트로는 호출 불가
- 역할 변경 시 사용자가 **재로그인**해야 새 claims가 반영됨
- 개발 환경에서는 `supabase/config.toml`에 Hook 설정이 별도로 필요함
