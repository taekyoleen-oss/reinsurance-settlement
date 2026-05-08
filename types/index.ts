import type { Database, Tables, TablesInsert, TablesUpdate } from './database'

// ─── Row types ────────────────────────────────────────────────
export type CurrencyRow = Tables<'rs_currencies'>
export type CounterpartyRow = Tables<'rs_counterparties'>
export type ContractRow = Tables<'rs_contracts'>
export type ContractShareRow = Tables<'rs_contract_shares'>
export type UserProfileRow = Tables<'rs_user_profiles'>
export type ExchangeRateRow = Tables<'rs_exchange_rates'>
export type TransactionRow = Tables<'rs_transactions'>
export type AccountCurrentRow = Tables<'rs_account_currents'>
export type AccountCurrentItemRow = Tables<'rs_account_current_items'>
export type SettlementRow = Tables<'rs_settlements'>
export type SettlementMatchRow = Tables<'rs_settlement_matches'>
export type ReconciliationItemRow = Tables<'rs_reconciliation_items'>
export type ShareTokenRow = Tables<'rs_share_tokens'>
export type ShareTokenLogRow = Tables<'rs_share_token_logs'>
export type PremiumBordereauRow = Tables<'rs_premium_bordereau'>
export type LossBordereauRow = Tables<'rs_loss_bordereau'>
// v1.5
export type ContractSettlementScheduleRow = Tables<'rs_contract_settlement_schedules'>
export type LossClaimRow = Tables<'rs_loss_claims'>
export type LossClaimTransactionRow = Tables<'rs_loss_claim_transactions'>

// Attachment - rs_attachments 미적용이므로 수동 정의
export type AttachmentEntityType =
  | 'contract'
  | 'transaction'
  | 'account_current'
  | 'settlement'
  | 'premium_bordereau'
  | 'loss_bordereau'
  | 'bordereau'

export interface AttachmentRow {
  id: string
  entity_type: AttachmentEntityType
  entity_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  note: string | null
  uploaded_by: string | null
  created_at: string
}

// ContractWithCedantRow / ContractCedantSummary (조인 결과 수동)
export type ContractWithCedantRow = ContractRow & {
  cedant?: CounterpartyRow | null
}
export type ContractCedantSummary = {
  cedant_id: string
  cedant_name: string
}

// ─── Insert types ─────────────────────────────────────────────
export type CurrencyInsert = TablesInsert<'rs_currencies'>
export type CounterpartyInsert = TablesInsert<'rs_counterparties'>
export type ContractInsert = TablesInsert<'rs_contracts'>
export type ContractShareInsert = TablesInsert<'rs_contract_shares'>
export type UserProfileInsert = TablesInsert<'rs_user_profiles'>
export type ExchangeRateInsert = TablesInsert<'rs_exchange_rates'>
// transaction_no/ac_no/settlement_no는 DB 트리거가 자동 채번 — Insert 시 optional로 오버라이드
export type TransactionInsert = Omit<TablesInsert<'rs_transactions'>, 'transaction_no'> & {
  transaction_no?: string
}
export type AccountCurrentInsert = Omit<TablesInsert<'rs_account_currents'>, 'ac_no'> & {
  ac_no?: string
}
export type AccountCurrentItemInsert = TablesInsert<'rs_account_current_items'>
export type SettlementInsert = Omit<TablesInsert<'rs_settlements'>, 'settlement_no'> & {
  settlement_no?: string
}
export type SettlementMatchInsert = TablesInsert<'rs_settlement_matches'>
export type ReconciliationItemInsert = TablesInsert<'rs_reconciliation_items'>
export type ShareTokenInsert = TablesInsert<'rs_share_tokens'>
export type ShareTokenLogInsert = TablesInsert<'rs_share_token_logs'>
export type PremiumBordereauInsert = TablesInsert<'rs_premium_bordereau'>
export type LossBordereauInsert = TablesInsert<'rs_loss_bordereau'>
// v1.5
export type ContractSettlementScheduleInsert = TablesInsert<'rs_contract_settlement_schedules'>
export type LossClaimInsert = TablesInsert<'rs_loss_claims'>
export type LossClaimTransactionInsert = TablesInsert<'rs_loss_claim_transactions'>

// ─── Update types ─────────────────────────────────────────────
export type CurrencyUpdate = TablesUpdate<'rs_currencies'>
export type CounterpartyUpdate = TablesUpdate<'rs_counterparties'>
export type ContractUpdate = TablesUpdate<'rs_contracts'>
export type ContractShareUpdate = TablesUpdate<'rs_contract_shares'>
export type UserProfileUpdate = TablesUpdate<'rs_user_profiles'>
export type ExchangeRateUpdate = TablesUpdate<'rs_exchange_rates'>
export type TransactionUpdate = TablesUpdate<'rs_transactions'>
export type AccountCurrentUpdate = TablesUpdate<'rs_account_currents'>
export type ReconciliationItemUpdate = TablesUpdate<'rs_reconciliation_items'>
export type ShareTokenUpdate = TablesUpdate<'rs_share_tokens'>
export type PremiumBordereauUpdate = TablesUpdate<'rs_premium_bordereau'>
export type LossBordereauUpdate = TablesUpdate<'rs_loss_bordereau'>
// v1.5
export type ContractSettlementScheduleUpdate = TablesUpdate<'rs_contract_settlement_schedules'>
export type LossClaimUpdate = TablesUpdate<'rs_loss_claims'>

// ─── Database re-export ───────────────────────────────────────
export type { Database }

// ─── Enum types (DB는 text 컬럼 사용 — 수동 정의) ────────────
export type UserRole =
  | 'broker_technician'
  | 'broker_manager'
  | 'reviewer'
  | 'cedant_viewer'
  | 'reinsurer_viewer'
  | 'admin'
export type ACStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'reviewed'
  | 'issued'
  | 'acknowledged'
  | 'disputed'
  | 'cancelled'
export type TransactionType =
  | 'premium'
  | 'claim'
  | 'commission'
  | 'adjustment'
  | 'deposit_premium'
  | 'profit_commission'
  | 'sliding_scale'
export type PeriodType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'adhoc'
export type TransactionStatus = 'draft' | 'confirmed' | 'cancelled' | 'billed' | 'settled'
export type TransactionDirection = 'to_reinsurer' | 'to_cedant'
export type AllocationType = 'proportional' | 'manual'
export type ContractType = 'proportional' | 'non_proportional'
export type TreatyType = 'quota_share' | 'surplus' | 'excess_of_loss' | 'stop_loss' | 'aggregate'
export type ClassOfBusiness =
  | 'fire'
  | 'marine'
  | 'casualty'
  | 'engineering'
  | 'life'
  | 'health'
  | 'motor'
  | 'aviation'
  | 'misc'
export type ContractStatus = 'active' | 'expired' | 'cancelled' | 'suspended'
export type CompanyType = 'cedant' | 'reinsurer' | 'broker'
export type ACDirection = 'to_reinsurer' | 'to_cedant'
export type SettlementType = 'receipt' | 'payment'
export type MatchStatus = 'unmatched' | 'partial' | 'fully_matched'
export type ReconciliationStatus =
  | 'open'
  | 'agreed'
  | 'disputed'
  | 'waived'
  | 'matched'
  | 'unmatched'
export type RateType = 'spot' | 'monthly_avg' | 'custom'
export type TokenTargetType = 'account_current' | 'contract'
export type TokenAction = 'view' | 'acknowledge' | 'comment'
export type UnderwritingBasis = 'risk_attaching' | 'losses_occurring' | 'claims_made'
export type ReserveReleaseTiming = 'immediate' | 'end_of_year' | 'run_off'
export type BordereauEntryType = 'new' | 'endorsement' | 'cancellation' | 'reinstatement'
export type LossStatus = 'open' | 'closed' | 'reopened'
export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'override'
// v1.5
export type ScheduleType = 'premium' | 'loss' | 'commission'
export type ScheduleStatus = 'open' | 'in_progress' | 'closed' | 'cancelled'
// v1.6 — 보험료 수령 확인
export type ReceiptDirection = 'inbound' | 'outbound'
export type ReceiptMatchStatus = 'unmatched' | 'partial' | 'matched'
export type ReceiptStatus =
  | 'no_schedule'
  | 'pending'
  | 'overdue'
  | 'partially_received'
  | 'overdue_partial'
  | 'fully_received'

export interface PremiumReceiptRow {
  id: string
  schedule_id: string
  contract_id: string
  counterparty_id: string
  direction: ReceiptDirection
  received_date: string
  received_amount: number
  received_currency: string
  exchange_rate: number
  received_amount_krw: number | null
  bank_reference: string | null
  receipt_note: string | null
  linked_transaction_id: string | null
  linked_ac_id: string | null
  match_status: ReceiptMatchStatus
  confirmed_by: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleReceiptSummary {
  schedule_id: string
  contract_id: string
  schedule_type: string
  period_label: string
  period_from: string
  period_to: string
  due_date: string | null
  expected_amount: number | null
  minimum_premium: number | null
  currency_code: string | null
  schedule_status: string
  receipt_count: number
  total_inbound: number
  total_outbound: number
  net_received: number
  last_received_date: string | null
  receipt_status: ReceiptStatus
  outstanding_amount: number
}
export type ClaimStatus =
  | 'open'
  | 'collecting'
  | 'ready_to_pay'
  | 'paying'
  | 'closed'
  | 'disputed'
  | 'cancelled'
export type ClaimTransactionRole =
  | 'receipt_from_reinsurer'
  | 'payment_to_cedant'
  | 'recovery'
  | 'adjustment'

// ─────────────────────────────────────────────
// 도메인 복합 타입 (UI/API 레이어용)
// ─────────────────────────────────────────────

/** 거래 + 계약/거래상대방 조인 */
export interface TransactionWithRelations extends TransactionRow {
  contract?: ContractRow
  counterparty?: CounterpartyRow
  parent_tx?: TransactionRow | null
}

/** 정산서 + 관계 */
export interface AccountCurrentWithRelations extends AccountCurrentRow {
  contract?: ContractRow
  counterparty?: CounterpartyRow
}

/** 결제 + 관계 */
export interface SettlementWithRelations extends SettlementRow {
  counterparty?: CounterpartyRow
}

/** 계약 + 지분율 목록 */
export interface ContractWithShares extends ContractRow {
  shares: ContractShareRow[]
}

/** 대사 항목 + 관계 */
export interface ReconciliationItemWithRelations extends ReconciliationItemRow {
  counterparty?: CounterpartyRow
  contract?: ContractRow
  transaction?: TransactionRow | null
}

/** AC 목록 필터 */
export interface ACFilters {
  contractId?: string
  cedantId?: string
  counterpartyId?: string
  status?: string
  periodType?: string
  dateFrom?: string
  dateTo?: string
}

/** 거래 목록 필터 */
export interface TransactionFilters {
  counterpartyId?: string
  contractId?: string
  status?: string
  transactionType?: string
  dateFrom?: string
  dateTo?: string
  isDeleted?: boolean
}

/** API 공통 응답 */
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  code?: string
}

// ─────────────────────────────────────────────
// Bordereau 복합 타입 (v1.4)
// ─────────────────────────────────────────────

/** 보험료 명세 + 계약 조인 */
export interface PremiumBordereauWithContract extends PremiumBordereauRow {
  contract?: ContractRow
}

/** 손해 명세 + 계약 + 보험료 명세 조인 */
export interface LossBordereauWithRelations extends LossBordereauRow {
  contract?: ContractRow
  premium_bordereau?: PremiumBordereauRow | null
}

/** Bordereau CSV 업로드 한 행의 파싱 결과 */
export interface BordereauCsvRow {
  rowIndex: number
  raw: Record<string, string>
  parsed: Partial<PremiumBordereauRow | LossBordereauRow>
  errors: string[]
  warnings: string[]
}

/** Bordereau 목록 필터 */
export interface BordereauFilters {
  contractId?: string
  periodYyyyqn?: string
  validationStatus?: string
  entryType?: string
  dateFrom?: string
  dateTo?: string
}
