import {
  calculateOutstanding,
  getAgingAnalysis,
  type OutstandingResult,
  type AgingResult,
} from '@/lib/utils/outstanding'

/**
 * 거래상대방별 미청산 잔액 조회
 */
export async function getOutstandingByCounterparty(
  counterpartyId?: string,
  currencyCode?: string
): Promise<OutstandingResult[]> {
  return calculateOutstanding(counterpartyId, currencyCode)
}

/**
 * Aging 분석 데이터 조회
 */
export async function getAgingData(
  counterpartyId?: string
): Promise<AgingResult[]> {
  return getAgingAnalysis(counterpartyId)
}

export type { OutstandingResult, AgingResult }
