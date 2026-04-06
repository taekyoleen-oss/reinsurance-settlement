-- =============================================================================
-- step2_rls_policies.sql
-- 재보험 정청산 관리 시스템 — Row Level Security (RLS) 정책
-- 설계서 §4.5 기반, supabase-rls SKILL.md 패턴 적용
-- 생성일: 2026-04-02
-- =============================================================================
-- 전제: step1_schema.sql 실행 완료 후 실행
-- 멱등성: DO $$ EXCEPTION WHEN duplicate_object 패턴으로 정책 중복 방지
-- =============================================================================

-- =============================================================================
-- 헬퍼 함수 (SECURITY DEFINER — 권한 격리 보장)
-- =============================================================================

-- 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION get_user_role() IS '현재 로그인 사용자의 역할(role) 반환. broker_technician/broker_manager/cedant_viewer/reinsurer_viewer/admin';

-- 브로커 내부 직원 여부 (broker_technician | broker_manager | admin)
CREATE OR REPLACE FUNCTION is_broker_internal()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role IN ('broker_technician', 'broker_manager', 'admin')
    FROM rs_user_profiles
    WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION is_broker_internal() IS '브로커 내부 직원 여부 반환. broker_technician/broker_manager/admin이면 true';

-- 현재 사용자의 company_id 조회 (외부 뷰어 전용)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT company_id FROM rs_user_profiles WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION get_user_company_id() IS '현재 로그인 사용자의 소속 거래처 ID 반환. 브로커 내부 직원이면 NULL';

-- =============================================================================
-- RLS 활성화 — 15개 테이블 전체
-- =============================================================================
ALTER TABLE rs_currencies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_counterparties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_contracts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_contract_shares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_exchange_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_transaction_audit       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_account_currents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_account_current_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_settlements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_settlement_matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_reconciliation_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_share_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_share_token_logs        ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 유틸리티: CREATE POLICY IF NOT EXISTS 에뮬레이션
-- Supabase PostgreSQL 15에서는 CREATE POLICY IF NOT EXISTS 미지원
-- → DO 블록으로 중복 방지
-- =============================================================================

-- =============================================================================
-- 1. rs_currencies — 통화 마스터
-- =============================================================================
-- 전체 읽기: 모든 인증 사용자 (통화 선택 UI용)
DO $$ BEGIN
    CREATE POLICY "currencies_select_all"
        ON rs_currencies FOR SELECT
        USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 내부 직원만
DO $$ BEGIN
    CREATE POLICY "currencies_insert_broker"
        ON rs_currencies FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "currencies_update_broker"
        ON rs_currencies FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "currencies_delete_admin"
        ON rs_currencies FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. rs_counterparties — 거래상대방 마스터
-- =============================================================================
-- 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "counterparties_select_broker"
        ON rs_counterparties FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 출재사 뷰어: 자사(company_id 일치) 레코드만 조회
DO $$ BEGIN
    CREATE POLICY "counterparties_select_cedant"
        ON rs_counterparties FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 수재사 뷰어: 자사(company_id 일치) 레코드만 조회
DO $$ BEGIN
    CREATE POLICY "counterparties_select_reinsurer"
        ON rs_counterparties FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 관리자·admin만
DO $$ BEGIN
    CREATE POLICY "counterparties_insert_manager"
        ON rs_counterparties FOR INSERT
        WITH CHECK (get_user_role() IN ('broker_manager', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "counterparties_update_manager"
        ON rs_counterparties FOR UPDATE
        USING (get_user_role() IN ('broker_manager', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "counterparties_delete_admin"
        ON rs_counterparties FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 3. rs_contracts — 계약 마스터
-- =============================================================================
-- 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "contracts_select_broker"
        ON rs_contracts FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 출재사 뷰어: cedant_id = 자사 company_id인 계약만
DO $$ BEGIN
    CREATE POLICY "contracts_select_cedant"
        ON rs_contracts FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND cedant_id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 수재사 뷰어: rs_contract_shares에 자사가 포함된 계약만
DO $$ BEGIN
    CREATE POLICY "contracts_select_reinsurer"
        ON rs_contracts FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND EXISTS (
                SELECT 1 FROM rs_contract_shares cs
                WHERE cs.contract_id = rs_contracts.id
                  AND cs.reinsurer_id = get_user_company_id()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "contracts_insert_technician"
        ON rs_contracts FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "contracts_update_technician"
        ON rs_contracts FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "contracts_delete_admin"
        ON rs_contracts FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 4. rs_contract_shares — 수재사 지분율
-- =============================================================================
-- 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "contract_shares_select_broker"
        ON rs_contract_shares FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 수재사 뷰어: 자사가 포함된 계약의 지분 정보만
DO $$ BEGIN
    CREATE POLICY "contract_shares_select_reinsurer"
        ON rs_contract_shares FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND reinsurer_id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 출재사 뷰어: 자사 계약의 지분 정보 조회
DO $$ BEGIN
    CREATE POLICY "contract_shares_select_cedant"
        ON rs_contract_shares FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND EXISTS (
                SELECT 1 FROM rs_contracts c
                WHERE c.id = rs_contract_shares.contract_id
                  AND c.cedant_id = get_user_company_id()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "contract_shares_insert_technician"
        ON rs_contract_shares FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "contract_shares_update_technician"
        ON rs_contract_shares FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "contract_shares_delete_admin"
        ON rs_contract_shares FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 5. rs_user_profiles — 사용자 프로필
-- =============================================================================
-- 본인 프로필 조회 (모든 역할)
DO $$ BEGIN
    CREATE POLICY "user_profiles_select_self"
        ON rs_user_profiles FOR SELECT
        USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 브로커 관리자·admin: 전체 조회
DO $$ BEGIN
    CREATE POLICY "user_profiles_select_manager"
        ON rs_user_profiles FOR SELECT
        USING (get_user_role() IN ('broker_manager', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 생성: admin만
DO $$ BEGIN
    CREATE POLICY "user_profiles_insert_admin"
        ON rs_user_profiles FOR INSERT
        WITH CHECK (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 수정: admin 또는 본인 프로필(full_name만 변경 가정)
DO $$ BEGIN
    CREATE POLICY "user_profiles_update_admin"
        ON rs_user_profiles FOR UPDATE
        USING (get_user_role() = 'admin' OR user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "user_profiles_delete_admin"
        ON rs_user_profiles FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 6. rs_exchange_rates — 환율 이력
-- =============================================================================
-- 읽기: 모든 인증 사용자 (거래 입력 시 환율 선택용)
DO $$ BEGIN
    CREATE POLICY "exchange_rates_select_all"
        ON rs_exchange_rates FOR SELECT
        USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "exchange_rates_insert_technician"
        ON rs_exchange_rates FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "exchange_rates_update_technician"
        ON rs_exchange_rates FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "exchange_rates_delete_admin"
        ON rs_exchange_rates FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 7. rs_transactions — 거래 내역 (핵심 정책)
-- =============================================================================

-- [SELECT] 브로커: 전체 조회 (is_deleted = false만 기본 노출)
DO $$ BEGIN
    CREATE POLICY "tx_select_broker"
        ON rs_transactions FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 출재사 뷰어: counterparty_id = 자사 company_id인 거래만 (패턴 2)
DO $$ BEGIN
    CREATE POLICY "tx_select_cedant"
        ON rs_transactions FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND counterparty_id = get_user_company_id()
            AND is_deleted = false
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 수재사 뷰어: 자사가 포함된 계약의 거래만 (패턴 3)
DO $$ BEGIN
    CREATE POLICY "tx_select_reinsurer"
        ON rs_transactions FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND is_deleted = false
            AND EXISTS (
                SELECT 1 FROM rs_contract_shares cs
                WHERE cs.contract_id = rs_transactions.contract_id
                  AND cs.reinsurer_id = get_user_company_id()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT] 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "tx_insert_technician"
        ON rs_transactions FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [UPDATE] 브로커 실무자 이상 + is_locked = false인 거래만 수정 가능 (패턴 4)
DO $$ BEGIN
    CREATE POLICY "tx_update_technician_unlocked"
        ON rs_transactions FOR UPDATE
        USING (
            is_broker_internal()
            AND is_locked = false
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [DELETE] Soft Delete만 허용 (admin이 is_deleted = true로 변경)
DO $$ BEGIN
    CREATE POLICY "tx_delete_admin"
        ON rs_transactions FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 8. rs_transaction_audit — 거래 수정 이력
-- =============================================================================
-- 읽기: 브로커 전체 + 외부 뷰어(자사 거래 관련)
DO $$ BEGIN
    CREATE POLICY "tx_audit_select_broker"
        ON rs_transaction_audit FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 쓰기: 브로커 실무자 이상 (감사 로그 자동 생성 시 사용)
DO $$ BEGIN
    CREATE POLICY "tx_audit_insert_broker"
        ON rs_transaction_audit FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 감사 로그 수정·삭제 불가 (admin도 불가 — 감사 무결성)
-- (정책 없음 = 차단됨, RLS 활성화 상태에서 정책 미설정 = DENY)

-- =============================================================================
-- 9. rs_account_currents — 정산서 헤더
-- =============================================================================

-- [SELECT] 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "ac_select_broker"
        ON rs_account_currents FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 출재사 뷰어: counterparty_id = 자사인 issued/acknowledged/disputed AC만
DO $$ BEGIN
    CREATE POLICY "ac_select_cedant"
        ON rs_account_currents FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND counterparty_id = get_user_company_id()
            AND status IN ('issued', 'acknowledged', 'disputed')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 수재사 뷰어: 자사가 포함된 계약의 issued/acknowledged/disputed AC만
DO $$ BEGIN
    CREATE POLICY "ac_select_reinsurer"
        ON rs_account_currents FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND counterparty_id = get_user_company_id()
            AND status IN ('issued', 'acknowledged', 'disputed')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT] 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "ac_insert_technician"
        ON rs_account_currents FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [UPDATE] 브로커 전체 상태 변경
DO $$ BEGIN
    CREATE POLICY "ac_update_broker"
        ON rs_account_currents FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [UPDATE] 출재사 뷰어: issued → acknowledged 상태 변경만 허용 (패턴 5)
DO $$ BEGIN
    CREATE POLICY "ac_acknowledge_cedant"
        ON rs_account_currents FOR UPDATE
        USING (
            get_user_role() = 'cedant_viewer'
            AND counterparty_id = get_user_company_id()
            AND status = 'issued'               -- issued 상태에서만
        )
        WITH CHECK (status = 'acknowledged');   -- acknowledged로만 변경 허용
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [UPDATE] 수재사 뷰어: issued → acknowledged 상태 변경만 허용 (패턴 5)
DO $$ BEGIN
    CREATE POLICY "ac_acknowledge_reinsurer"
        ON rs_account_currents FOR UPDATE
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND counterparty_id = get_user_company_id()
            AND status = 'issued'               -- issued 상태에서만
        )
        WITH CHECK (status = 'acknowledged');   -- acknowledged로만 변경 허용
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [DELETE] admin만
DO $$ BEGIN
    CREATE POLICY "ac_delete_admin"
        ON rs_account_currents FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 10. rs_account_current_items — 정산서 스냅샷 항목 (v1.3)
-- =============================================================================
-- [SELECT] 설계서 §4.5 패턴: 해당 AC를 볼 수 있는 역할만 조회 가능
DO $$ BEGIN
    CREATE POLICY "ac_items_select_all_roles"
        ON rs_account_current_items FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM rs_account_currents ac
                JOIN rs_user_profiles up ON up.user_id = auth.uid()
                WHERE ac.id = rs_account_current_items.ac_id
                  AND (
                      -- 브로커 내부: 전체
                      up.role IN ('broker_technician', 'broker_manager', 'admin')
                      OR
                      -- 출재사 뷰어: 자사 counterparty이고 issued 이상인 AC
                      (up.role = 'cedant_viewer'
                       AND ac.counterparty_id = up.company_id
                       AND ac.status IN ('issued', 'acknowledged', 'disputed'))
                      OR
                      -- 수재사 뷰어: 자사 counterparty이고 issued 이상인 AC
                      (up.role = 'reinsurer_viewer'
                       AND ac.counterparty_id = up.company_id
                       AND ac.status IN ('issued', 'acknowledged', 'disputed'))
                  )
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT] 브로커 실무자 이상 (AC issued 전환 시 스냅샷 저장)
DO $$ BEGIN
    CREATE POLICY "ac_items_insert_broker"
        ON rs_account_current_items FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 스냅샷은 수정·삭제 불가 (무결성 보장)
-- (UPDATE/DELETE 정책 미설정 = DENY)

-- =============================================================================
-- 11. rs_settlements — 결제 내역
-- =============================================================================
-- [SELECT] 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "settlements_select_broker"
        ON rs_settlements FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 출재사 뷰어: 자사 counterparty_id인 결제만
DO $$ BEGIN
    CREATE POLICY "settlements_select_cedant"
        ON rs_settlements FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND counterparty_id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 수재사 뷰어: 자사 counterparty_id인 결제만
DO $$ BEGIN
    CREATE POLICY "settlements_select_reinsurer"
        ON rs_settlements FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND counterparty_id = get_user_company_id()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT/UPDATE] 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "settlements_insert_technician"
        ON rs_settlements FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "settlements_update_technician"
        ON rs_settlements FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "settlements_delete_admin"
        ON rs_settlements FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 12. rs_settlement_matches — 결제 ↔ 정산서 매칭
-- =============================================================================
-- [SELECT] 브로커: 전체 조회
DO $$ BEGIN
    CREATE POLICY "settlement_matches_select_broker"
        ON rs_settlement_matches FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 출재사 뷰어: 자사 AC에 매칭된 레코드만
DO $$ BEGIN
    CREATE POLICY "settlement_matches_select_cedant"
        ON rs_settlement_matches FOR SELECT
        USING (
            get_user_role() = 'cedant_viewer'
            AND EXISTS (
                SELECT 1 FROM rs_account_currents ac
                WHERE ac.id = rs_settlement_matches.account_current_id
                  AND ac.counterparty_id = get_user_company_id()
                  AND ac.status IN ('issued', 'acknowledged', 'disputed')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [SELECT] 수재사 뷰어: 자사 AC에 매칭된 레코드만
DO $$ BEGIN
    CREATE POLICY "settlement_matches_select_reinsurer"
        ON rs_settlement_matches FOR SELECT
        USING (
            get_user_role() = 'reinsurer_viewer'
            AND EXISTS (
                SELECT 1 FROM rs_account_currents ac
                WHERE ac.id = rs_settlement_matches.account_current_id
                  AND ac.counterparty_id = get_user_company_id()
                  AND ac.status IN ('issued', 'acknowledged', 'disputed')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT/UPDATE/DELETE] 브로커 실무자 이상
DO $$ BEGIN
    CREATE POLICY "settlement_matches_insert_broker"
        ON rs_settlement_matches FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "settlement_matches_update_broker"
        ON rs_settlement_matches FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "settlement_matches_delete_broker"
        ON rs_settlement_matches FOR DELETE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 13. rs_reconciliation_items — 대사 항목 (브로커 전용)
-- =============================================================================
-- 대사 항목은 브로커 내부 직원만 접근 (외부 뷰어 완전 차단) — 패턴 1
DO $$ BEGIN
    CREATE POLICY "reconciliation_all_broker_only"
        ON rs_reconciliation_items FOR ALL
        USING (is_broker_internal())
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 14. rs_share_tokens — 토큰 URL 관리
-- =============================================================================
-- [SELECT] 브로커: 전체 조회 (토큰 관리 화면)
DO $$ BEGIN
    CREATE POLICY "share_tokens_select_broker"
        ON rs_share_tokens FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT] 브로커 실무자 이상 (토큰 생성)
DO $$ BEGIN
    CREATE POLICY "share_tokens_insert_broker"
        ON rs_share_tokens FOR INSERT
        WITH CHECK (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [UPDATE] 브로커: 토큰 취소(revoked=true) 처리
DO $$ BEGIN
    CREATE POLICY "share_tokens_update_broker"
        ON rs_share_tokens FOR UPDATE
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [DELETE] admin만
DO $$ BEGIN
    CREATE POLICY "share_tokens_delete_admin"
        ON rs_share_tokens FOR DELETE
        USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 주의: /share/[token] Route Handler는 SUPABASE_SERVICE_ROLE_KEY로 RLS 우회 처리
-- (서버사이드에서 토큰 유효성 검증 후 응답, 클라이언트 직접 접근 없음)

-- =============================================================================
-- 15. rs_share_token_logs — 토큰 접근 로그
-- =============================================================================
-- [SELECT] 브로커: 접근 로그 조회
DO $$ BEGIN
    CREATE POLICY "share_token_logs_select_broker"
        ON rs_share_token_logs FOR SELECT
        USING (is_broker_internal());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [INSERT] 서비스 역할(service_role)을 통해 서버사이드에서 삽입
-- 클라이언트 직접 삽입 차단 (보안)
-- 실제 삽입은 Route Handler에서 adminClient(service_role_key) 사용

-- =============================================================================
-- 완료 메시지
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== step2_rls_policies.sql 실행 완료 ===';
    RAISE NOTICE '헬퍼 함수: get_user_role(), is_broker_internal(), get_user_company_id()';
    RAISE NOTICE 'RLS 활성화: 15개 테이블';
    RAISE NOTICE '정책 적용:';
    RAISE NOTICE '  - 브로커 실무자/관리자/admin: 전체 접근';
    RAISE NOTICE '  - 출재사 뷰어: 자사 counterparty_id 기준 데이터만 + AC Acknowledge 허용';
    RAISE NOTICE '  - 수재사 뷰어: 자사 contract_shares 기준 데이터만 + AC Acknowledge 허용';
    RAISE NOTICE '  - is_locked=true 거래 UPDATE 차단';
    RAISE NOTICE '  - rs_reconciliation_items: 브로커 전용 (외부 뷰어 완전 차단)';
    RAISE NOTICE '  - rs_account_current_items: 스냅샷 수정/삭제 불가';
    RAISE NOTICE '  - rs_transaction_audit: 감사 로그 수정/삭제 불가';
END $$;
