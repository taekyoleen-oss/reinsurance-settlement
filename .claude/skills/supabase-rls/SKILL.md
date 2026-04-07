# 스킬: supabase-rls

## 목적
재보험 정청산 시스템의 Supabase Row Level Security(RLS) 정책 설계 패턴을 제공한다.

## 역할 체계

```typescript
type UserRole =
  | 'broker_technician'  // 브로커 실무자
  | 'broker_manager'     // 브로커 관리자
  | 'cedant_viewer'      // 출재사 뷰어
  | 'reinsurer_viewer'   // 수재사 뷰어
  | 'admin'              // 시스템 관리자
```

## 헬퍼 함수

```sql
-- 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

-- 브로커 내부 직원 여부
CREATE OR REPLACE FUNCTION is_broker_internal()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role IN ('broker_technician','broker_manager','admin')
  FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

-- 현재 사용자의 company_id 조회
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT company_id FROM rs_user_profiles WHERE user_id = auth.uid()
$$;
```

## 정책 패턴

### 패턴 1: 브로커 전용 테이블

```sql
-- 브로커 내부 직원만 모든 작업 허용
ALTER TABLE rs_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_all" ON rs_reconciliation_items
  FOR ALL USING (is_broker_internal());
```

### 패턴 2: 출재사 뷰어 조회

```sql
-- counterparty_id = 자사 company_id인 레코드만
CREATE POLICY "cedant_viewer_select" ON rs_transactions
  FOR SELECT USING (
    is_broker_internal() OR
    (get_user_role() = 'cedant_viewer' AND counterparty_id = get_user_company_id())
  );
```

### 패턴 3: 수재사 뷰어 조회

```sql
-- rs_contract_shares에 자사가 포함된 계약의 레코드만
CREATE POLICY "reinsurer_viewer_select" ON rs_transactions
  FOR SELECT USING (
    is_broker_internal() OR
    (get_user_role() = 'reinsurer_viewer' AND EXISTS (
      SELECT 1 FROM rs_contract_shares cs
      WHERE cs.contract_id = rs_transactions.contract_id
        AND cs.reinsurer_id = get_user_company_id()
    ))
  );
```

### 패턴 4: 잠금 거래 수정 차단

```sql
CREATE POLICY "no_edit_locked" ON rs_transactions
  FOR UPDATE USING (is_locked = false);
```

### 패턴 5: AC Acknowledge (외부 뷰어 업데이트)

```sql
-- 외부 뷰어가 자신의 AC에 대해 acknowledged 상태로만 변경 가능
CREATE POLICY "viewer_acknowledge" ON rs_account_currents
  FOR UPDATE USING (
    (get_user_role() IN ('cedant_viewer','reinsurer_viewer'))
    AND counterparty_id = get_user_company_id()
    AND status = 'issued'  -- issued 상태에서만 acknowledge 가능
  )
  WITH CHECK (status = 'acknowledged');  -- acknowledged로만 변경 허용
```

## 토큰 URL 처리

토큰 URL(`/share/[token]`)은 **RLS를 우회**하지 않는다.
대신 서버사이드 Route Handler에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용하여 직접 조회한다.

```typescript
// app/share/[token]/page.tsx (서버 컴포넌트)
import { adminClient } from '@/lib/supabase/admin'

const { data: token } = await adminClient
  .from('rs_share_tokens')
  .select('*')
  .eq('token', tokenParam)
  .eq('revoked', false)
  .gt('expires_at', new Date().toISOString())
  .single()
```

## 주의사항
- `SECURITY DEFINER` 함수는 최소한으로 사용
- RLS 정책은 `SELECT`, `INSERT`, `UPDATE`, `DELETE` 별도 정의 권장
- `auth.uid()` 반환값이 NULL이면 모든 접근 차단됨 (인증 필수)
