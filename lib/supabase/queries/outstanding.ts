import {
  calculateOutstanding,
  getAgingAnalysis,
  getOutstandingDetail,
  type OutstandingResult,
  type AgingResult,
  type OutstandingDetailItem,
} from '@/lib/utils/outstanding'

/**
 * 거래상대방별 미청산 잔액 조회
 */
export async function getOutstandingByCounterparty(
  counterpartyId?: string,
  currencyCode?: string,
  contractId?: string,
  cedantId?: string
): Promise<OutstandingResult[]> {
  return calculateOutstanding(counterpartyId, currencyCode, contractId, cedantId)
}

/**
 * Aging 분석 데이터 조회
 */
export async function getAgingData(
  counterpartyId?: string,
  contractId?: string,
  cedantId?: string
): Promise<AgingResult[]> {
  return getAgingAnalysis(counterpartyId, contractId, cedantId)
}

export async function getOutstandingDetailData(
  counterpartyId?: string,
  currencyCode?: string,
  contractId?: string,
  cedantId?: string
): Promise<OutstandingDetailItem[]> {
  return getOutstandingDetail(counterpartyId, currencyCode, contractId, cedantId)
}

export type { OutstandingResult, AgingResult, OutstandingDetailItem }
