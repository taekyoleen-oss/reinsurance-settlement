/**
 * 통화별 소수점 자릿수 반환
 * KRW, JPY: 0자리 / 기타: 2자리
 */
function getDecimalDigits(currencyCode: string): number {
  const zeroDecimalCurrencies = ['KRW', 'JPY']
  return zeroDecimalCurrencies.includes(currencyCode.toUpperCase()) ? 0 : 2
}

/**
 * 금액을 통화별 포맷으로 변환
 * KRW: ₩1,234,567 (소수점 0자리)
 * JPY: ¥1,234,567 (소수점 0자리)
 * USD/EUR/GBP/기타: $1,234.56 (소수점 2자리)
 */
export function formatAmount(
  amount: number,
  currencyCode: string,
  locale: string = 'ko-KR'
): string {
  const decimals = getDecimalDigits(currencyCode)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    // 알 수 없는 통화 코드 fallback
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
    return `${currencyCode.toUpperCase()} ${formatted}`
  }
}

/**
 * 금액을 결제 통화로 환산
 * fromCurrency가 toCurrency와 같으면 rate=1 적용
 */
export function convertToSettlementCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount
  const converted = amount * rate
  const decimals = getDecimalDigits(toCurrency)
  const factor = Math.pow(10, decimals)
  return Math.round(converted * factor) / factor
}

/**
 * 숫자를 통화 심볼 없이 숫자만 포맷 (테이블 표시용)
 */
export function formatNumber(amount: number, currencyCode: string): string {
  const decimals = getDecimalDigits(currencyCode)
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}
