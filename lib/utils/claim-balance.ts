export interface ClaimBalance {
  totalClaimed: number
  collected: number
  paid: number
  collectionRate: number // 0~100%
  paymentRate: number
  remainingToCollect: number
  remainingToPay: number
  isFullyCollected: boolean
  isFullyPaid: boolean
}

export function calcClaimBalance(params: {
  totalClaimedAmount: number
  collectedAmount: number
  paidAmount: number
}): ClaimBalance {
  const { totalClaimedAmount: total, collectedAmount: collected, paidAmount: paid } = params
  const collectionRate = total > 0 ? Math.min((collected / total) * 100, 100) : 0
  const paymentRate = total > 0 ? Math.min((paid / total) * 100, 100) : 0
  return {
    totalClaimed: total,
    collected,
    paid,
    collectionRate: Math.round(collectionRate * 10) / 10,
    paymentRate: Math.round(paymentRate * 10) / 10,
    remainingToCollect: Math.max(total - collected, 0),
    remainingToPay: Math.max(total - paid, 0),
    isFullyCollected: collected >= total,
    isFullyPaid: paid >= total,
  }
}

export function deriveClaimStatus(balance: ClaimBalance): string {
  if (balance.isFullyCollected && balance.isFullyPaid) return 'closed'
  if (balance.paid > 0) return 'paying'
  if (balance.isFullyCollected) return 'ready_to_pay'
  if (balance.collected > 0) return 'collecting'
  return 'open'
}
