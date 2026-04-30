// 재보험 정청산 시스템 TypeScript 타입 정의
// 모든 rs_ 테이블의 Row / Insert / Update 타입 (수동 작성)

// ─────────────────────────────────────────────
// 공통 열거형 타입
// ─────────────────────────────────────────────

export type UserRole =
  | 'broker_technician'
  | 'broker_manager'
  | 'cedant_viewer'
  | 'reinsurer_viewer'
  | 'admin'

export type ACStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'acknowledged'
  | 'disputed'
  | 'cancelled'

export type TransactionType =
  | 'premium'
  | 'return_premium'
  | 'loss'
  | 'commission'
  | 'deposit_premium'
  | 'interest'
  | 'adjustment'

export type PeriodType = 'quarterly' | 'semiannual' | 'annual' | 'adhoc'

export type TransactionStatus = 'draft' | 'confirmed' | 'billed' | 'settled' | 'cancelled'
export type TransactionDirection = 'receivable' | 'payable'
export type AllocationType = 'auto' | 'manual'
export type ContractType = 'treaty' | 'facultative'
export type TreatyType = 'proportional' | 'non_proportional'
export type ClassOfBusiness = 'fire' | 'marine' | 'liability' | 'engineering' | 'misc'
export type ContractStatus = 'active' | 'expired' | 'cancelled'
export type CompanyType = 'cedant' | 'reinsurer' | 'both' | 'broker'
export type UnderwritingBasis = 'UY' | 'clean_cut'
export type ReserveReleaseTiming = 'next_period' | 'period_after_next'
export type BordereauEntryType = 'new' | 'cancel' | 'refund' | 'adjustment'
export type LossStatus = 'in_progress' | 'paid' | 'closed' | 'denied'
export type ValidationStatus = 'pending' | 'valid' | 'error' | 'warning'
export type ACDirection = 'to_cedant' | 'to_reinsurer'
export type SettlementType = 'receipt' | 'payment'
export type MatchStatus = 'unmatched' | 'partial' | 'fully_matched'
export type ReconciliationStatus = 'matched' | 'unmatched' | 'disputed'
export type RateType = 'spot' | 'monthly_avg' | 'custom'
export type TokenTargetType = 'account_current'
export type TokenAction = 'view' | 'download_pdf'

// ─────────────────────────────────────────────
// rs_currencies — 통화 마스터
// ─────────────────────────────────────────────

export interface CurrencyRow {
  code: string
  name_ko: string
  name_en: string
  symbol: string
  decimal_digits: number
  is_base: boolean
  is_active: boolean
  display_order: number | null
  created_by: string | null
  created_at: string
}

export interface CurrencyInsert {
  code: string
  name_ko: string
  name_en: string
  symbol: string
  decimal_digits?: number
  is_base?: boolean
  is_active?: boolean
  display_order?: number | null
  created_by?: string | null
  created_at?: string
}

export interface CurrencyUpdate {
  name_ko?: string
  name_en?: string
  symbol?: string
  decimal_digits?: number
  is_base?: boolean
  is_active?: boolean
  display_order?: number | null
}

// ─────────────────────────────────────────────
// rs_counterparties — 거래상대방
// ─────────────────────────────────────────────

export interface CounterpartyRow {
  id: string
  company_code: string
  company_name_ko: string
  company_name_en: string
  company_type: CompanyType
  country_code: string | null
  default_currency: string | null
  contact_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CounterpartyInsert {
  id?: string
  company_code: string
  company_name_ko: string
  company_name_en: string
  company_type: CompanyType
  country_code?: string | null
  default_currency?: string | null
  contact_email?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface CounterpartyUpdate {
  company_code?: string
  company_name_ko?: string
  company_name_en?: string
  company_type?: CompanyType
  country_code?: string | null
  default_currency?: string | null
  contact_email?: string | null
  is_active?: boolean
  updated_at?: string
}

// ─────────────────────────────────────────────
// rs_contracts — 계약 마스터
// ─────────────────────────────────────────────

export interface ContractRow {
  id: string
  contract_no: string
  contract_type: ContractType
  treaty_type: TreatyType | null
  class_of_business: ClassOfBusiness | null
  cedant_id: string
  inception_date: string
  expiry_date: string | null
  settlement_currency: string
  settlement_period: PeriodType
  status: ContractStatus
  description: string | null
  // v1.4 추가 컬럼
  broker_id: string | null
  underwriting_basis: UnderwritingBasis | null
  ceding_commission_rate: number | null
  profit_commission_rate: number | null
  brokerage_rate: number | null
  premium_reserve_rate: number | null
  loss_reserve_rate: number | null
  interest_rate: number | null
  reserve_release_timing: ReserveReleaseTiming | null
  payment_due_days: number | null
  confirmation_due_days: number | null
  offset_allowed: boolean
  cash_loss_threshold: number | null
  created_by: string
  created_at: string
  updated_at: string
}

/** 목록/상세 API에서 rs_counterparties(cedant) 조인 시 */
export type ContractCedantSummary = Pick<CounterpartyRow, 'company_name_ko' | 'company_code'>

export interface ContractWithCedantRow extends ContractRow {
  cedant?: ContractCedantSummary | null
}

export interface ContractInsert {
  id?: string
  contract_no: string
  contract_type: ContractType
  treaty_type?: TreatyType | null
  class_of_business?: ClassOfBusiness | null
  cedant_id: string
  inception_date: string
  expiry_date?: string | null
  settlement_currency: string
  settlement_period: PeriodType
  status?: ContractStatus
  description?: string | null
  broker_id?: string | null
  underwriting_basis?: UnderwritingBasis | null
  ceding_commission_rate?: number | null
  profit_commission_rate?: number | null
  brokerage_rate?: number | null
  premium_reserve_rate?: number | null
  loss_reserve_rate?: number | null
  interest_rate?: number | null
  reserve_release_timing?: ReserveReleaseTiming | null
  payment_due_days?: number | null
  confirmation_due_days?: number | null
  offset_allowed?: boolean
  cash_loss_threshold?: number | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface ContractUpdate {
  contract_no?: string
  contract_type?: ContractType
  treaty_type?: TreatyType | null
  class_of_business?: ClassOfBusiness | null
  cedant_id?: string
  inception_date?: string
  expiry_date?: string | null
  settlement_currency?: string
  settlement_period?: PeriodType
  status?: ContractStatus
  description?: string | null
  broker_id?: string | null
  underwriting_basis?: UnderwritingBasis | null
  ceding_commission_rate?: number | null
  profit_commission_rate?: number | null
  brokerage_rate?: number | null
  premium_reserve_rate?: number | null
  loss_reserve_rate?: number | null
  interest_rate?: number | null
  reserve_release_timing?: ReserveReleaseTiming | null
  payment_due_days?: number | null
  confirmation_due_days?: number | null
  offset_allowed?: boolean
  cash_loss_threshold?: number | null
  updated_at?: string
}

// ─────────────────────────────────────────────
// rs_contract_shares — 수재사 지분율
// ─────────────────────────────────────────────

export interface ContractShareRow {
  id: string
  contract_id: string
  reinsurer_id: string
  signed_line: number
  order_of_priority: number
  effective_from: string
  effective_to: string | null
}

export interface ContractShareInsert {
  id?: string
  contract_id: string
  reinsurer_id: string
  signed_line: number
  order_of_priority: number
  effective_from: string
  effective_to?: string | null
}

export interface ContractShareUpdate {
  signed_line?: number
  order_of_priority?: number
  effective_from?: string
  effective_to?: string | null
}

// ─────────────────────────────────────────────
// rs_user_profiles — 사용자 프로필
// ─────────────────────────────────────────────

export interface UserProfileRow {
  id: string
  user_id: string
  role: UserRole
  company_id: string | null
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface UserProfileInsert {
  id?: string
  user_id: string
  role: UserRole
  company_id?: string | null
  full_name?: string | null
  is_active?: boolean
  created_at?: string
}

export interface UserProfileUpdate {
  role?: UserRole
  company_id?: string | null
  full_name?: string | null
  is_active?: boolean
}

// ─────────────────────────────────────────────
// rs_exchange_rates — 환율 이력
// ─────────────────────────────────────────────

export interface ExchangeRateRow {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  rate_date: string
  rate_type: RateType
  source: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export interface ExchangeRateInsert {
  id?: string
  from_currency: string
  to_currency?: string
  rate: number
  rate_date: string
  rate_type: RateType
  source?: string | null
  notes?: string | null
  created_by: string
  created_at?: string
}

export interface ExchangeRateUpdate {
  rate?: number
  rate_type?: RateType
  source?: string | null
  notes?: string | null
}

// ─────────────────────────────────────────────
// rs_transactions — 거래 내역
// ─────────────────────────────────────────────

export interface TransactionRow {
  id: string
  transaction_no: string
  contract_id: string
  contract_type: ContractType
  transaction_type: TransactionType
  direction: TransactionDirection
  counterparty_id: string
  parent_tx_id: string | null
  allocation_type: AllocationType | null
  amount_original: number
  currency_code: string
  exchange_rate: number | null
  amount_krw: number | null
  transaction_date: string
  due_date: string | null
  period_from: string | null
  period_to: string | null
  loss_reference: string | null
  description: string | null
  status: TransactionStatus
  account_current_id: string | null
  is_locked: boolean
  is_deleted: boolean
  is_allocation_parent: boolean
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionInsert {
  id?: string
  transaction_no?: string
  contract_id: string
  contract_type: ContractType
  transaction_type: TransactionType
  direction: TransactionDirection
  counterparty_id: string
  parent_tx_id?: string | null
  allocation_type?: AllocationType | null
  amount_original: number
  currency_code: string
  exchange_rate?: number | null
  amount_krw?: number | null
  transaction_date: string
  due_date?: string | null
  period_from?: string | null
  period_to?: string | null
  loss_reference?: string | null
  description?: string | null
  status?: TransactionStatus
  account_current_id?: string | null
  is_locked?: boolean
  is_deleted?: boolean
  is_allocation_parent?: boolean
  created_by: string
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface TransactionUpdate {
  transaction_type?: TransactionType
  direction?: TransactionDirection
  counterparty_id?: string
  amount_original?: number
  currency_code?: string
  exchange_rate?: number | null
  amount_krw?: number | null
  transaction_date?: string
  due_date?: string | null
  period_from?: string | null
  period_to?: string | null
  loss_reference?: string | null
  description?: string | null
  status?: TransactionStatus
  account_current_id?: string | null
  is_locked?: boolean
  is_deleted?: boolean
  updated_by?: string | null
  updated_at?: string
}

// ─────────────────────────────────────────────
// rs_account_currents — 정산서 헤더
// ─────────────────────────────────────────────

export interface AccountCurrentRow {
  id: string
  ac_no: string
  contract_id: string
  counterparty_id: string
  direction: ACDirection
  period_type: PeriodType
  period_from: string
  period_to: string
  currency_code: string
  balance_bf: number
  subtotal_premium: number
  subtotal_loss: number
  subtotal_commission: number
  subtotal_other: number
  net_balance: number
  status: ACStatus
  approved_by: string | null
  approved_at: string | null
  issued_at: string | null
  due_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AccountCurrentInsert {
  id?: string
  ac_no?: string
  contract_id: string
  counterparty_id: string
  direction: ACDirection
  period_type: PeriodType
  period_from: string
  period_to: string
  currency_code: string
  balance_bf?: number
  subtotal_premium?: number
  subtotal_loss?: number
  subtotal_commission?: number
  subtotal_other?: number
  net_balance?: number
  status?: ACStatus
  approved_by?: string | null
  approved_at?: string | null
  issued_at?: string | null
  due_date?: string | null
  notes?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface AccountCurrentUpdate {
  direction?: ACDirection
  balance_bf?: number
  subtotal_premium?: number
  subtotal_loss?: number
  subtotal_commission?: number
  subtotal_other?: number
  net_balance?: number
  status?: ACStatus
  approved_by?: string | null
  approved_at?: string | null
  issued_at?: string | null
  due_date?: string | null
  notes?: string | null
  updated_at?: string
}

// ─────────────────────────────────────────────
// rs_account_current_items — 정산서 스냅샷 항목
// ─────────────────────────────────────────────

export interface AccountCurrentItemRow {
  ac_id: string
  tx_id: string
  transaction_type: TransactionType
  description: string | null
  amount_original: number
  currency_code: string
  exchange_rate: number | null
  amount_settlement_currency: number
  direction: TransactionDirection
  snapshot_date: string
}

export interface AccountCurrentItemInsert {
  ac_id: string
  tx_id: string
  transaction_type: TransactionType
  description?: string | null
  amount_original: number
  currency_code: string
  exchange_rate?: number | null
  amount_settlement_currency: number
  direction: TransactionDirection
  snapshot_date?: string
}

// ─────────────────────────────────────────────
// rs_settlements — 결제 내역
// ─────────────────────────────────────────────

export interface SettlementRow {
  id: string
  settlement_no: string
  settlement_type: SettlementType
  counterparty_id: string
  amount: number
  currency_code: string
  exchange_rate: number | null
  amount_krw: number | null
  settlement_date: string
  bank_reference: string | null
  match_status: MatchStatus
  matched_amount: number
  notes: string | null
  created_by: string
  created_at: string
}

export interface SettlementInsert {
  id?: string
  settlement_no?: string
  settlement_type: SettlementType
  counterparty_id: string
  amount: number
  currency_code: string
  exchange_rate?: number | null
  amount_krw?: number | null
  settlement_date: string
  bank_reference?: string | null
  match_status?: MatchStatus
  matched_amount?: number
  notes?: string | null
  created_by: string
  created_at?: string
}

export interface SettlementUpdate {
  settlement_type?: SettlementType
  amount?: number
  currency_code?: string
  exchange_rate?: number | null
  amount_krw?: number | null
  settlement_date?: string
  bank_reference?: string | null
  match_status?: MatchStatus
  matched_amount?: number
  notes?: string | null
}

// ─────────────────────────────────────────────
// rs_settlement_matches — 결제 매칭
// ─────────────────────────────────────────────

export interface SettlementMatchRow {
  id: string
  settlement_id: string
  ac_id: string
  tx_id: string | null
  matched_amount: number
  created_by: string
  created_at: string
}

export interface SettlementMatchInsert {
  id?: string
  settlement_id: string
  ac_id: string
  tx_id?: string | null
  matched_amount: number
  created_by: string
  created_at?: string
}

// ─────────────────────────────────────────────
// rs_reconciliation_items — 대사 항목
// ─────────────────────────────────────────────

export interface ReconciliationItemRow {
  id: string
  counterparty_id: string
  contract_id: string
  period_from: string
  period_to: string
  transaction_type: TransactionType
  tx_id: string | null
  broker_amount: number
  counterparty_claimed_amount: number | null
  difference: number | null
  status: ReconciliationStatus
  notes: string | null
  created_by: string
  created_at: string
}

export interface ReconciliationItemInsert {
  id?: string
  counterparty_id: string
  contract_id: string
  period_from: string
  period_to: string
  transaction_type: TransactionType
  tx_id?: string | null
  broker_amount: number
  counterparty_claimed_amount?: number | null
  difference?: number | null
  status?: ReconciliationStatus
  notes?: string | null
  created_by: string
  created_at?: string
}

export interface ReconciliationItemUpdate {
  counterparty_claimed_amount?: number | null
  difference?: number | null
  status?: ReconciliationStatus
  notes?: string | null
}

// ─────────────────────────────────────────────
// rs_share_tokens — 토큰 URL 관리
// ─────────────────────────────────────────────

export interface ShareTokenRow {
  id: string
  token: string
  target_type: TokenTargetType
  target_id: string
  created_by: string
  expires_at: string
  revoked: boolean
  revoked_by: string | null
  revoked_at: string | null
  notes: string | null
  created_at: string
}

export interface ShareTokenInsert {
  id?: string
  token: string
  target_type: TokenTargetType
  target_id: string
  created_by: string
  expires_at: string
  revoked?: boolean
  revoked_by?: string | null
  revoked_at?: string | null
  notes?: string | null
  created_at?: string
}

export interface ShareTokenUpdate {
  revoked?: boolean
  revoked_by?: string | null
  revoked_at?: string | null
}

// ─────────────────────────────────────────────
// rs_share_token_logs — 토큰 접근 로그
// ─────────────────────────────────────────────

export interface ShareTokenLogRow {
  id: string
  token_id: string
  accessed_at: string
  ip_address: string | null
  user_agent: string | null
  action: TokenAction
}

export interface ShareTokenLogInsert {
  id?: string
  token_id: string
  accessed_at?: string
  ip_address?: string | null
  user_agent?: string | null
  action: TokenAction
}

// ─────────────────────────────────────────────
// Database 타입 맵 (Supabase 클라이언트용)
// ─────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      rs_currencies: {
        Row: CurrencyRow
        Insert: CurrencyInsert
        Update: CurrencyUpdate
        Relationships: []
      }
      rs_counterparties: {
        Row: CounterpartyRow
        Insert: CounterpartyInsert
        Update: CounterpartyUpdate
        Relationships: []
      }
      rs_contracts: {
        Row: ContractRow
        Insert: ContractInsert
        Update: ContractUpdate
        Relationships: []
      }
      rs_contract_shares: {
        Row: ContractShareRow
        Insert: ContractShareInsert
        Update: ContractShareUpdate
        Relationships: []
      }
      rs_user_profiles: {
        Row: UserProfileRow
        Insert: UserProfileInsert
        Update: UserProfileUpdate
        Relationships: []
      }
      rs_exchange_rates: {
        Row: ExchangeRateRow
        Insert: ExchangeRateInsert
        Update: ExchangeRateUpdate
        Relationships: []
      }
      rs_transactions: {
        Row: TransactionRow
        Insert: TransactionInsert
        Update: TransactionUpdate
        Relationships: []
      }
      rs_account_currents: {
        Row: AccountCurrentRow
        Insert: AccountCurrentInsert
        Update: AccountCurrentUpdate
        Relationships: []
      }
      rs_account_current_items: {
        Row: AccountCurrentItemRow
        Insert: AccountCurrentItemInsert
        Update: Partial<AccountCurrentItemInsert>
        Relationships: []
      }
      rs_settlements: {
        Row: SettlementRow
        Insert: SettlementInsert
        Update: SettlementUpdate
        Relationships: []
      }
      rs_settlement_matches: {
        Row: SettlementMatchRow
        Insert: SettlementMatchInsert
        Update: Partial<SettlementMatchInsert>
        Relationships: []
      }
      rs_reconciliation_items: {
        Row: ReconciliationItemRow
        Insert: ReconciliationItemInsert
        Update: ReconciliationItemUpdate
        Relationships: []
      }
      rs_share_tokens: {
        Row: ShareTokenRow
        Insert: ShareTokenInsert
        Update: ShareTokenUpdate
        Relationships: []
      }
      rs_share_token_logs: {
        Row: ShareTokenLogRow
        Insert: ShareTokenLogInsert
        Update: Partial<ShareTokenLogInsert>
        Relationships: []
      }
      rs_premium_bordereau: {
        Row: PremiumBordereauRow
        Insert: PremiumBordereauInsert
        Update: PremiumBordereauUpdate
        Relationships: []
      }
      rs_loss_bordereau: {
        Row: LossBordereauRow
        Insert: LossBordereauInsert
        Update: LossBordereauUpdate
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─────────────────────────────────────────────
// rs_premium_bordereau — 보험료 라인 명세 (v1.4)
// ─────────────────────────────────────────────

export interface PremiumBordereauRow {
  id: string
  contract_id: string
  transaction_id: string | null
  period_yyyyqn: string
  policy_no: string
  insured_name: string | null
  risk_period_from: string
  risk_period_to: string
  sum_insured: number
  original_premium: number
  cession_pct: number
  ceded_premium: number
  entry_type: BordereauEntryType
  currency: string
  validation_status: ValidationStatus
  validation_messages: Record<string, unknown>[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PremiumBordereauInsert {
  id?: string
  contract_id: string
  transaction_id?: string | null
  period_yyyyqn: string
  policy_no: string
  insured_name?: string | null
  risk_period_from: string
  risk_period_to: string
  sum_insured: number
  original_premium: number
  cession_pct: number
  ceded_premium: number
  entry_type?: BordereauEntryType
  currency: string
  validation_status?: ValidationStatus
  validation_messages?: Record<string, unknown>[] | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface PremiumBordereauUpdate {
  transaction_id?: string | null
  period_yyyyqn?: string
  policy_no?: string
  insured_name?: string | null
  risk_period_from?: string
  risk_period_to?: string
  sum_insured?: number
  original_premium?: number
  cession_pct?: number
  ceded_premium?: number
  entry_type?: BordereauEntryType
  currency?: string
  validation_status?: ValidationStatus
  validation_messages?: Record<string, unknown>[] | null
  updated_at?: string
}

// ─────────────────────────────────────────────
// rs_loss_bordereau — 손해 라인 명세 (v1.4)
// ─────────────────────────────────────────────

export interface LossBordereauRow {
  id: string
  contract_id: string
  transaction_id: string | null
  premium_bordereau_id: string | null
  period_yyyyqn: string
  claim_no: string
  loss_date: string
  report_date: string | null
  paid_amount: number
  os_reserve: number
  cession_pct: number
  recoverable_amount: number
  is_cash_loss: boolean
  loss_status: LossStatus
  currency: string
  validation_status: ValidationStatus
  validation_messages: Record<string, unknown>[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LossBordereauInsert {
  id?: string
  contract_id: string
  transaction_id?: string | null
  premium_bordereau_id?: string | null
  period_yyyyqn: string
  claim_no: string
  loss_date: string
  report_date?: string | null
  paid_amount?: number
  os_reserve?: number
  cession_pct: number
  recoverable_amount?: number
  is_cash_loss?: boolean
  loss_status?: LossStatus
  currency: string
  validation_status?: ValidationStatus
  validation_messages?: Record<string, unknown>[] | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface LossBordereauUpdate {
  transaction_id?: string | null
  premium_bordereau_id?: string | null
  period_yyyyqn?: string
  claim_no?: string
  loss_date?: string
  report_date?: string | null
  paid_amount?: number
  os_reserve?: number
  cession_pct?: number
  recoverable_amount?: number
  is_cash_loss?: boolean
  loss_status?: LossStatus
  currency?: string
  validation_status?: ValidationStatus
  validation_messages?: Record<string, unknown>[] | null
  updated_at?: string
}
