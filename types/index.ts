// 도메인 타입 re-export
export type {
  // 열거형
  UserRole,
  ACStatus,
  TransactionType,
  PeriodType,
  TransactionStatus,
  TransactionDirection,
  AllocationType,
  ContractType,
  TreatyType,
  ClassOfBusiness,
  ContractStatus,
  CompanyType,
  ACDirection,
  SettlementType,
  MatchStatus,
  ReconciliationStatus,
  RateType,
  TokenTargetType,
  TokenAction,
  UnderwritingBasis,
  ReserveReleaseTiming,
  BordereauEntryType,
  LossStatus,
  ValidationStatus,

  // Row 타입
  CurrencyRow,
  CounterpartyRow,
  ContractRow,
  ContractWithCedantRow,
  ContractCedantSummary,
  ContractShareRow,
  UserProfileRow,
  ExchangeRateRow,
  TransactionRow,
  AccountCurrentRow,
  AccountCurrentItemRow,
  SettlementRow,
  SettlementMatchRow,
  ReconciliationItemRow,
  ShareTokenRow,
  ShareTokenLogRow,
  PremiumBordereauRow,
  LossBordereauRow,

  // Insert 타입
  CurrencyInsert,
  CounterpartyInsert,
  ContractInsert,
  ContractShareInsert,
  UserProfileInsert,
  ExchangeRateInsert,
  TransactionInsert,
  AccountCurrentInsert,
  AccountCurrentItemInsert,
  SettlementInsert,
  SettlementMatchInsert,
  ReconciliationItemInsert,
  ShareTokenInsert,
  ShareTokenLogInsert,
  PremiumBordereauInsert,
  LossBordereauInsert,

  // Update 타입
  CurrencyUpdate,
  CounterpartyUpdate,
  ContractUpdate,
  ContractShareUpdate,
  UserProfileUpdate,
  ExchangeRateUpdate,
  TransactionUpdate,
  AccountCurrentUpdate,
  ReconciliationItemUpdate,
  ShareTokenUpdate,
  PremiumBordereauUpdate,
  LossBordereauUpdate,

  // Database 타입 맵
  Database,
} from './database'

// ─────────────────────────────────────────────
// 도메인 복합 타입 (UI/API 레이어용)
// ─────────────────────────────────────────────

import type {
  TransactionRow,
  AccountCurrentRow,
  ContractRow,
  CounterpartyRow,
  SettlementRow,
  ContractShareRow,
  ReconciliationItemRow,
  PremiumBordereauRow,
  LossBordereauRow,
} from './database'

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
