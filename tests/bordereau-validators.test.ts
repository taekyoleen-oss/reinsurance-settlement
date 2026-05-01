import { describe, it, expect } from 'vitest'
import {
  validatePremiumBordereau,
  validateLossBordereau,
  parsePremiumCsvRow,
  parseLossCsvRow,
} from '@/lib/utils/bordereau-validators'
import type { ContractRow, PremiumBordereauInsert, LossBordereauInsert } from '@/types/database'

// ─── 픽스처 ────────────────────────────────────────────────

const BASE_CONTRACT: ContractRow = {
  id: 'c1',
  contract_no: 'TEST-2024-001',
  contract_type: 'treaty',
  treaty_type: 'proportional',
  class_of_business: 'fire',
  cedant_id: 'cedant-1',
  inception_date: '2024-01-01',
  expiry_date: '2024-12-31',
  settlement_currency: 'USD',
  settlement_period: 'quarterly',
  status: 'active',
  description: null,
  broker_id: null,
  underwriting_basis: null,
  ceding_commission_rate: null,
  profit_commission_rate: null,
  brokerage_rate: null,
  premium_reserve_rate: null,
  loss_reserve_rate: null,
  interest_rate: null,
  reserve_release_timing: null,
  payment_due_days: null,
  confirmation_due_days: null,
  offset_allowed: false,
  cash_loss_threshold: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const BASE_PREMIUM_ROW: PremiumBordereauInsert = {
  contract_id: 'c1',
  period_yyyyqn: '2024Q1',
  policy_no: 'POL-001',
  risk_period_from: '2024-02-01',
  risk_period_to: '2024-11-30',
  sum_insured: 1_000_000,
  original_premium: 10_000,
  cession_pct: 0.3,
  ceded_premium: 3_000,
  currency: 'USD',
}

const BASE_LOSS_ROW: LossBordereauInsert = {
  contract_id: 'c1',
  period_yyyyqn: '2024Q1',
  claim_no: 'CLM-001',
  loss_date: '2024-03-01',
  paid_amount: 5_000,
  os_reserve: 2_000,
  cession_pct: 0.3,
  recoverable_amount: 2_100,
  currency: 'USD',
}

// ─── validatePremiumBordereau ──────────────────────────────

describe('validatePremiumBordereau', () => {
  it('통과: 올바른 입력', () => {
    const result = validatePremiumBordereau(BASE_PREMIUM_ROW, BASE_CONTRACT)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('오류: 통화 불일치', () => {
    const row = { ...BASE_PREMIUM_ROW, currency: 'KRW' }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('통화 불일치'))).toBe(true)
  })

  it('오류: 위험 시작일이 계약 시작일보다 앞', () => {
    const row = { ...BASE_PREMIUM_ROW, risk_period_from: '2023-12-01' }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('계약 시작일'))).toBe(true)
  })

  it('경고: 위험 종료일이 계약 만기일 초과 (expiry_date 있는 경우)', () => {
    const row = { ...BASE_PREMIUM_ROW, risk_period_to: '2025-06-30' }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w) => w.includes('계약 종료일'))).toBe(true)
  })

  it('expiry_date 없으면 종료일 초과 경고 없음', () => {
    const contract = { ...BASE_CONTRACT, expiry_date: null }
    const row = { ...BASE_PREMIUM_ROW, risk_period_to: '2026-12-31' }
    const result = validatePremiumBordereau(row, contract)
    expect(result.warnings).toHaveLength(0)
  })

  it('오류: 위험 종료일이 시작일보다 앞', () => {
    const row = {
      ...BASE_PREMIUM_ROW,
      risk_period_from: '2024-06-01',
      risk_period_to: '2024-01-01',
    }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('종료일이 시작일'))).toBe(true)
  })

  it('오류: 출재비율 범위 초과 (>1)', () => {
    const row = { ...BASE_PREMIUM_ROW, cession_pct: 1.5, ceded_premium: 15_000 }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('출재비율'))).toBe(true)
  })

  it('오류: 출재비율 0 이하', () => {
    const row = { ...BASE_PREMIUM_ROW, cession_pct: 0 }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
  })

  it('오류: 출재보험료 불일치 (±1원 초과)', () => {
    // 10000 * 0.3 = 3000, 입력값 1500 → 차이 1500
    const row = { ...BASE_PREMIUM_ROW, ceded_premium: 1_500 }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('출재보험료 불일치'))).toBe(true)
  })

  it('통과: 출재보험료 ±1원 이내 허용 (소수점 오차)', () => {
    // 10000 * 0.3 = 3000, 입력값 3001 → 차이 1 (허용)
    const row = { ...BASE_PREMIUM_ROW, ceded_premium: 3_001 }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.errors.filter((e) => e.includes('출재보험료'))).toHaveLength(0)
  })

  it('오류: 보험가입금액 음수', () => {
    const row = { ...BASE_PREMIUM_ROW, sum_insured: -1 }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('보험가입금액'))).toBe(true)
  })

  it('경고: 취소 명세에 원보험료가 양수', () => {
    const row = { ...BASE_PREMIUM_ROW, entry_type: 'cancel' as const }
    const result = validatePremiumBordereau(row, BASE_CONTRACT)
    expect(result.warnings.some((w) => w.includes('취소/환급'))).toBe(true)
  })
})

// ─── validateLossBordereau ────────────────────────────────

describe('validateLossBordereau', () => {
  it('통과: 올바른 입력', () => {
    const result = validateLossBordereau(BASE_LOSS_ROW, BASE_CONTRACT)
    expect(result.valid).toBe(true)
  })

  it('오류: 통화 불일치', () => {
    const row = { ...BASE_LOSS_ROW, currency: 'EUR' }
    const result = validateLossBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('통화 불일치'))).toBe(true)
  })

  it('오류: 출재비율 0', () => {
    const row = { ...BASE_LOSS_ROW, cession_pct: 0 }
    const result = validateLossBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
  })

  it('경고: 재보험금 회수액 불일치 (±1원 초과)', () => {
    // (5000 + 2000) * 0.3 = 2100, 입력값 500 → 차이 1600
    const row = { ...BASE_LOSS_ROW, recoverable_amount: 500 }
    const result = validateLossBordereau(row, BASE_CONTRACT)
    expect(result.warnings.some((w) => w.includes('재보험금 회수액 불일치'))).toBe(true)
  })

  it('경고: Cash Loss 한도 초과', () => {
    const contract = { ...BASE_CONTRACT, cash_loss_threshold: 5_000 }
    // paid(5000) + os_reserve(2000) = 7000 > 5000, is_cash_loss=false
    const row = { ...BASE_LOSS_ROW, is_cash_loss: false }
    const result = validateLossBordereau(row, contract)
    expect(result.warnings.some((w) => w.includes('Cash Loss'))).toBe(true)
  })

  it('통과: Cash Loss 한도 초과이지만 is_cash_loss=true', () => {
    const contract = { ...BASE_CONTRACT, cash_loss_threshold: 5_000 }
    const row = { ...BASE_LOSS_ROW, is_cash_loss: true }
    const result = validateLossBordereau(row, contract)
    expect(result.warnings.filter((w) => w.includes('Cash Loss'))).toHaveLength(0)
  })

  it('오류: 사고 보고일이 발생일보다 앞', () => {
    const row = { ...BASE_LOSS_ROW, loss_date: '2024-05-01', report_date: '2024-03-01' }
    const result = validateLossBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('보고일'))).toBe(true)
  })

  it('오류: 지급보험금 음수', () => {
    const row = { ...BASE_LOSS_ROW, paid_amount: -100 }
    const result = validateLossBordereau(row, BASE_CONTRACT)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('지급보험금'))).toBe(true)
  })
})

// ─── parsePremiumCsvRow ───────────────────────────────────

describe('parsePremiumCsvRow', () => {
  const validRaw = {
    policy_no: 'POL-001',
    period_yyyyqn: '2024Q1',
    risk_period_from: '2024-01-01',
    risk_period_to: '2024-12-31',
    sum_insured: '1000000',
    original_premium: '10000',
    cession_pct: '0.3',
    ceded_premium: '3000',
    currency: 'usd',
  }

  it('통과: 올바른 CSV 행', () => {
    const { parsed, parseErrors } = parsePremiumCsvRow(validRaw)
    expect(parseErrors).toHaveLength(0)
    expect(parsed.policy_no).toBe('POL-001')
    expect(parsed.sum_insured).toBe(1_000_000)
    expect(parsed.cession_pct).toBe(0.3)
    expect(parsed.currency).toBe('USD') // 대문자 변환
  })

  it('오류: 필수 필드 누락', () => {
    const { parseErrors } = parsePremiumCsvRow({ ...validRaw, policy_no: '' })
    expect(parseErrors.some((e) => e.includes('policy_no'))).toBe(true)
  })

  it('오류: 금액 숫자 아님', () => {
    const { parseErrors } = parsePremiumCsvRow({ ...validRaw, sum_insured: 'ABC' })
    expect(parseErrors.some((e) => e.includes('sum_insured'))).toBe(true)
  })

  it('자동변환: cession_pct 30% → 0.30', () => {
    const { parsed } = parsePremiumCsvRow({ ...validRaw, cession_pct: '30' })
    expect(parsed.cession_pct).toBeCloseTo(0.3)
  })

  it('ceded_premium 미입력 시 원보험료 × 출재비율 자동 계산', () => {
    const raw = { ...validRaw, ceded_premium: '' }
    const { parsed } = parsePremiumCsvRow(raw)
    expect(parsed.ceded_premium).toBeCloseTo(3_000)
  })

  it('entry_type 미입력 시 기본값 new', () => {
    const { parsed } = parsePremiumCsvRow({ ...validRaw, entry_type: '' })
    expect(parsed.entry_type).toBe('new')
  })
})

// ─── parseLossCsvRow ──────────────────────────────────────

describe('parseLossCsvRow', () => {
  const validRaw = {
    claim_no: 'CLM-001',
    period_yyyyqn: '2024Q1',
    loss_date: '2024-03-01',
    paid_amount: '5000',
    os_reserve: '2000',
    cession_pct: '0.3',
    currency: 'USD',
  }

  it('통과: 올바른 CSV 행', () => {
    const { parsed, parseErrors } = parseLossCsvRow(validRaw)
    expect(parseErrors).toHaveLength(0)
    expect(parsed.claim_no).toBe('CLM-001')
    expect(parsed.paid_amount).toBe(5_000)
    expect(parsed.recoverable_amount).toBeCloseTo(2_100) // (5000+2000)*0.3
  })

  it('오류: claim_no 누락', () => {
    const { parseErrors } = parseLossCsvRow({ ...validRaw, claim_no: '' })
    expect(parseErrors.some((e) => e.includes('claim_no'))).toBe(true)
  })

  it('오류: cession_pct 숫자 아님', () => {
    const { parseErrors } = parseLossCsvRow({ ...validRaw, cession_pct: 'XYZ' })
    expect(parseErrors.some((e) => e.includes('cession_pct'))).toBe(true)
  })

  it('자동변환: cession_pct 30% → 0.30', () => {
    const { parsed } = parseLossCsvRow({ ...validRaw, cession_pct: '30' })
    expect(parsed.cession_pct).toBeCloseTo(0.3)
  })

  it('is_cash_loss 파싱: "true" → true, "1" → true, 그 외 → false', () => {
    expect(parseLossCsvRow({ ...validRaw, is_cash_loss: 'true' }).parsed.is_cash_loss).toBe(true)
    expect(parseLossCsvRow({ ...validRaw, is_cash_loss: '1' }).parsed.is_cash_loss).toBe(true)
    expect(parseLossCsvRow({ ...validRaw, is_cash_loss: 'false' }).parsed.is_cash_loss).toBe(false)
    expect(parseLossCsvRow({ ...validRaw, is_cash_loss: '' }).parsed.is_cash_loss).toBe(false)
  })

  it('loss_status 기본값 in_progress', () => {
    const { parsed } = parseLossCsvRow({ ...validRaw, loss_status: '' })
    expect(parsed.loss_status).toBe('in_progress')
  })

  it('loss_status 유효한 값 파싱', () => {
    const { parsed } = parseLossCsvRow({ ...validRaw, loss_status: 'paid' })
    expect(parsed.loss_status).toBe('paid')
  })
})
