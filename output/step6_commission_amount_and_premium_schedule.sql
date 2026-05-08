-- ============================================================
-- Step 6: 수수료 금액 필드 추가 (비율+금액 혼합 지원)
-- ============================================================
-- 각 수수료 유형에 고정 금액 컬럼 추가
-- 비율(rate)과 금액(amount)를 동시에 입력 가능 → 혼합(mixed) 모드 지원
-- ============================================================

ALTER TABLE rs_contracts
  ADD COLUMN IF NOT EXISTS ceding_commission_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS profit_commission_amount  numeric(18,2),
  ADD COLUMN IF NOT EXISTS brokerage_amount          numeric(18,2);

COMMENT ON COLUMN rs_contracts.ceding_commission_amount IS '출재수수료 고정금액 (rate와 혼합 가능)';
COMMENT ON COLUMN rs_contracts.profit_commission_amount  IS '이익수수료 고정금액 (rate와 혼합 가능)';
COMMENT ON COLUMN rs_contracts.brokerage_amount          IS '중개수수료 고정금액 (rate와 혼합 가능)';
