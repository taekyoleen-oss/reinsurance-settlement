import type { ContractRow, PremiumBordereauInsert, LossBordereauInsert } from '@/types/database'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** 보험료 명세 단일 행 검증 */
export function validatePremiumBordereau(
  row: PremiumBordereauInsert,
  contract: ContractRow
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 통화 일치
  if (row.currency !== contract.settlement_currency) {
    errors.push(`통화 불일치: 명세 ${row.currency} ≠ 계약 ${contract.settlement_currency}`)
  }

  // 위험기간이 계약기간 내
  const riskFrom = new Date(row.risk_period_from)
  const riskTo = new Date(row.risk_period_to)
  const contractFrom = new Date(contract.inception_date)

  if (riskFrom < contractFrom) {
    errors.push(`위험 시작일(${row.risk_period_from})이 계약 시작일(${contract.inception_date})보다 앞입니다`)
  }
  if (contract.expiry_date) {
    const contractTo = new Date(contract.expiry_date)
    if (riskTo > contractTo) {
      warnings.push(`위험 종료일(${row.risk_period_to})이 계약 종료일(${contract.expiry_date})을 초과합니다`)
    }
  }

  // 위험기간 논리
  if (riskTo < riskFrom) {
    errors.push('위험 종료일이 시작일보다 앞입니다')
  }

  // 출재비율 범위
  if (row.cession_pct <= 0 || row.cession_pct > 1) {
    errors.push(`출재비율(${row.cession_pct})은 0 초과 1 이하이어야 합니다`)
  }

  // 출재보험료 일치 검증 (±1원 허용, 소수점 반올림 오차)
  const expectedCeded = Math.round(row.original_premium * row.cession_pct * 100) / 100
  const diff = Math.abs(row.ceded_premium - expectedCeded)
  if (diff > 1) {
    errors.push(
      `출재보험료 불일치: 입력 ${row.ceded_premium} ≠ 계산값 ${expectedCeded} (원보험료 ${row.original_premium} × ${row.cession_pct})`
    )
  }

  // 금액 음수 체크
  if (row.sum_insured < 0) errors.push('보험가입금액은 0 이상이어야 합니다')
  if (row.original_premium < 0) errors.push('원보험료는 0 이상이어야 합니다')
  if (row.ceded_premium < 0) errors.push('출재보험료는 0 이상이어야 합니다')

  // 취소/환급인 경우 원보험료 0 경고
  if ((row.entry_type === 'cancel' || row.entry_type === 'refund') && row.original_premium > 0) {
    warnings.push('취소/환급 명세의 원보험료가 양수입니다. 음수 입력을 권장합니다')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** 손해 명세 단일 행 검증 */
export function validateLossBordereau(
  row: LossBordereauInsert,
  contract: ContractRow
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 통화 일치
  if (row.currency !== contract.settlement_currency) {
    errors.push(`통화 불일치: 명세 ${row.currency} ≠ 계약 ${contract.settlement_currency}`)
  }

  // 출재비율 범위
  if (row.cession_pct <= 0 || row.cession_pct > 1) {
    errors.push(`출재비율(${row.cession_pct})은 0 초과 1 이하이어야 합니다`)
  }

  // 재보험금 회수액 일치 검증
  const paid = row.paid_amount ?? 0
  const osReserve = row.os_reserve ?? 0
  const expectedRecoverable = Math.round((paid + osReserve) * row.cession_pct * 100) / 100
  const inputRecoverable = row.recoverable_amount ?? 0
  const diff = Math.abs(inputRecoverable - expectedRecoverable)
  if (diff > 1) {
    warnings.push(
      `재보험금 회수액 불일치: 입력 ${inputRecoverable} ≠ 계산값 ${expectedRecoverable} ((지급 ${paid} + 미결 ${osReserve}) × ${row.cession_pct})`
    )
  }

  // Cash Loss 임계값 검증
  if (contract.cash_loss_threshold !== null && contract.cash_loss_threshold !== undefined) {
    const totalIncurred = paid + osReserve
    if (totalIncurred >= contract.cash_loss_threshold && !row.is_cash_loss) {
      warnings.push(
        `총 손해액(${totalIncurred})이 Cash Loss 한도(${contract.cash_loss_threshold})를 초과합니다. Cash Loss 여부를 확인하세요`
      )
    }
  }

  // 금액 음수 체크
  if (paid < 0) errors.push('지급보험금은 0 이상이어야 합니다')
  if (osReserve < 0) errors.push('미결손해는 0 이상이어야 합니다')
  if (inputRecoverable < 0) errors.push('재보험금 회수액은 0 이상이어야 합니다')

  // 사고일 논리
  if (row.report_date && row.loss_date) {
    if (new Date(row.report_date) < new Date(row.loss_date)) {
      errors.push('사고 보고일이 발생일보다 앞입니다')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** CSV 행을 보험료 명세 Insert 타입으로 변환 */
export function parsePremiumCsvRow(raw: Record<string, string>): {
  parsed: Partial<PremiumBordereauInsert>
  parseErrors: string[]
} {
  const parseErrors: string[] = []
  const parsed: Partial<PremiumBordereauInsert> = {}

  if (!raw.policy_no) parseErrors.push('증권번호(policy_no)가 없습니다')
  else parsed.policy_no = raw.policy_no.trim()

  if (!raw.period_yyyyqn) parseErrors.push('회계기간(period_yyyyqn)이 없습니다')
  else parsed.period_yyyyqn = raw.period_yyyyqn.trim()

  if (raw.insured_name) parsed.insured_name = raw.insured_name.trim()

  if (!raw.risk_period_from) parseErrors.push('위험시작일(risk_period_from)이 없습니다')
  else parsed.risk_period_from = raw.risk_period_from.trim()

  if (!raw.risk_period_to) parseErrors.push('위험종료일(risk_period_to)이 없습니다')
  else parsed.risk_period_to = raw.risk_period_to.trim()

  const sumInsured = parseFloat(raw.sum_insured)
  if (isNaN(sumInsured)) parseErrors.push('보험가입금액(sum_insured)이 숫자가 아닙니다')
  else parsed.sum_insured = sumInsured

  const originalPremium = parseFloat(raw.original_premium)
  if (isNaN(originalPremium)) parseErrors.push('원보험료(original_premium)가 숫자가 아닙니다')
  else parsed.original_premium = originalPremium

  const cessionPct = parseFloat(raw.cession_pct)
  if (isNaN(cessionPct)) parseErrors.push('출재비율(cession_pct)이 숫자가 아닙니다')
  else parsed.cession_pct = cessionPct > 1 ? cessionPct / 100 : cessionPct  // 30%로 입력 시 0.30으로 자동 변환

  if (parsed.original_premium !== undefined && parsed.cession_pct !== undefined) {
    const cededFromCsv = parseFloat(raw.ceded_premium)
    parsed.ceded_premium = isNaN(cededFromCsv)
      ? Math.round(parsed.original_premium * parsed.cession_pct * 100) / 100
      : cededFromCsv
  }

  const validEntryTypes = ['new', 'cancel', 'refund', 'adjustment']
  if (raw.entry_type && validEntryTypes.includes(raw.entry_type)) {
    parsed.entry_type = raw.entry_type as PremiumBordereauInsert['entry_type']
  } else {
    parsed.entry_type = 'new'
  }

  if (!raw.currency) parseErrors.push('통화(currency)가 없습니다')
  else parsed.currency = raw.currency.trim().toUpperCase()

  return { parsed, parseErrors }
}

/** CSV 행을 손해 명세 Insert 타입으로 변환 */
export function parseLossCsvRow(raw: Record<string, string>): {
  parsed: Partial<LossBordereauInsert>
  parseErrors: string[]
} {
  const parseErrors: string[] = []
  const parsed: Partial<LossBordereauInsert> = {}

  if (!raw.claim_no) parseErrors.push('사고번호(claim_no)가 없습니다')
  else parsed.claim_no = raw.claim_no.trim()

  if (!raw.period_yyyyqn) parseErrors.push('회계기간(period_yyyyqn)이 없습니다')
  else parsed.period_yyyyqn = raw.period_yyyyqn.trim()

  if (!raw.loss_date) parseErrors.push('사고발생일(loss_date)이 없습니다')
  else parsed.loss_date = raw.loss_date.trim()

  if (raw.report_date) parsed.report_date = raw.report_date.trim()

  parsed.paid_amount = parseFloat(raw.paid_amount) || 0
  parsed.os_reserve = parseFloat(raw.os_reserve) || 0

  const cessionPct = parseFloat(raw.cession_pct)
  if (isNaN(cessionPct)) parseErrors.push('출재비율(cession_pct)이 숫자가 아닙니다')
  else parsed.cession_pct = cessionPct > 1 ? cessionPct / 100 : cessionPct

  if (parsed.cession_pct !== undefined) {
    parsed.recoverable_amount =
      Math.round((parsed.paid_amount + parsed.os_reserve) * parsed.cession_pct * 100) / 100
  }

  parsed.is_cash_loss = raw.is_cash_loss?.toLowerCase() === 'true' || raw.is_cash_loss === '1'

  const validStatuses = ['in_progress', 'paid', 'closed', 'denied']
  parsed.loss_status =
    raw.loss_status && validStatuses.includes(raw.loss_status)
      ? (raw.loss_status as LossBordereauInsert['loss_status'])
      : 'in_progress'

  if (!raw.currency) parseErrors.push('통화(currency)가 없습니다')
  else parsed.currency = raw.currency.trim().toUpperCase()

  return { parsed, parseErrors }
}
