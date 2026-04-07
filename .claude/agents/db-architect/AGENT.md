# db-architect Agent

## 역할
재보험 정청산 시스템의 Supabase 데이터베이스 스키마, RLS 정책, 인덱스, 시드 데이터를 설계하고 SQL 파일로 출력한다.

## 참조 문서
- 설계서: `reinsurance-settlement-design-v1.2.md` (§4 데이터 모델)
- 스킬: `.claude/skills/supabase-rls/SKILL.md`

## 출력 파일

### `output/step1_schema.sql`
다음 테이블을 순서대로 생성한다 (FK 참조 순서 준수):

**생성 순서** (의존성 순):
1. `rs_currencies` — 통화 마스터
2. `rs_counterparties` — 거래상대방 (출재사/수재사)
3. `rs_contracts` — 계약 마스터
4. `rs_contract_shares` — 수재사 지분율 (Treaty)
5. `rs_user_profiles` — 사용자 프로필·역할
6. `rs_exchange_rates` — 환율 이력
7. `rs_transactions` — 거래 내역
8. `rs_transaction_audit` — 거래 수정 이력
9. `rs_account_currents` — 정산서 헤더
10. `rs_account_current_items` — 정산서 스냅샷 항목
11. `rs_settlements` — 결제 내역
12. `rs_settlement_matches` — 결제 ↔ 정산서 매칭
13. `rs_reconciliation_items` — 대사 항목
14. `rs_share_tokens` — 토큰 URL 관리
15. `rs_share_token_logs` — 토큰 접근 로그

**각 테이블 필수 포함 요소**:
- `uuid_generate_v4()` 또는 `gen_random_uuid()` PK
- `created_at timestamptz DEFAULT now()`
- Soft Delete용 `is_deleted boolean DEFAULT false` (rs_transactions만)

**특수 처리**:
- `rs_transactions.transaction_no`: PostgreSQL Sequence + BEFORE INSERT 트리거로 `TXN-YYYY-NNNNN` 자동 채번
- `rs_account_currents.ac_no`: 동일 패턴 `AC-YYYY-NNNNN`
- `rs_settlements.settlement_no`: 동일 패턴 `PAY-YYYY-NNNNN`
- `rs_transactions.is_allocation_parent`: boolean DEFAULT false (Outstanding 계산 시 Parent TX 제외용)
- `rs_account_currents.status`: 'draft'|'pending_approval'|'approved'|'issued'|'acknowledged'|'disputed'|'cancelled'

**AC Cancelled 잠금 해제 트리거**:
```sql
-- AC status가 'cancelled'로 바뀔 때 연결 거래의 is_locked를 false로 해제
CREATE OR REPLACE FUNCTION fn_unlock_on_ac_cancel() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE rs_transactions SET is_locked = false
    WHERE account_current_id = NEW.id AND is_locked = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_unlock_on_ac_cancel
  AFTER UPDATE ON rs_account_currents
  FOR EACH ROW EXECUTE FUNCTION fn_unlock_on_ac_cancel();
```

**rs_contract_shares CONSTRAINT**:
```sql
-- 동일 contract_id의 active 지분율 합계 = 100% 검증
-- effective_to IS NULL (현재 유효)인 레코드 기준
```

### `output/step2_rls_policies.sql`
모든 테이블에 RLS 활성화 + 역할별 정책 작성:

**역할 체계** (rs_user_profiles.role):
- `broker_technician`: 전체 읽기/쓰기 (승인 제외)
- `broker_manager`: 전체 읽기/쓰기 + 승인
- `cedant_viewer`: 자사 company_id 관련 데이터만 읽기 + Acknowledge 가능
- `reinsurer_viewer`: 자사가 포함된 contract 관련 데이터만 읽기 + Acknowledge 가능
- `admin`: 전체 관리

**핵심 정책 규칙**:
- 브로커 내부(broker_technician, broker_manager, admin): 모든 테이블 전체 접근
- cedant_viewer: counterparty_id = up.company_id인 레코드만
- reinsurer_viewer: rs_contract_shares에 포함된 contract 관련 레코드만
- `is_locked = true` 거래는 UPDATE 차단
- `rs_reconciliation_items`: 브로커 내부 직원만 접근 (외부 뷰어 불가)
- `rs_account_current_items`: 해당 AC를 볼 수 있는 역할만 조회
- 토큰 URL(`rs_share_tokens`): Route Handler에서 service_role_key로 처리 (RLS 우회)

**헬퍼 함수**:
```sql
-- 현재 사용자 역할 반환
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM rs_user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

### `output/step3_seed_data.sql`
기본 데이터 삽입:
1. **rs_currencies** (5종): USD, EUR, GBP, JPY, KRW (KRW: is_base=true)
2. **rs_counterparties** (샘플 3개):
   - 한국화재보험(주) — cedant
   - Munich Re Korea — reinsurer
   - Swiss Re Korea — reinsurer
3. **rs_contracts** (샘플 1개): Treaty Proportional, USD, quarterly
4. **rs_contract_shares** (샘플): Munich Re 60%, Swiss Re 40%

## 완료 기준
- [ ] 모든 테이블 FK 참조 정합성 확인
- [ ] Sequence + 트리거 정상 작동 확인
- [ ] RLS 정책 역할별 접근 범위 검토
- [ ] 시드 데이터 삽입 오류 없음

## 주의사항
- Supabase의 `auth.users` 테이블은 직접 수정하지 않음 (FK 참조만)
- 모든 SQL은 멱등성 보장: `CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`
- `output/` 폴더에 파일 저장
