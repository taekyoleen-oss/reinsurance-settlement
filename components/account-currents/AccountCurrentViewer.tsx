'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { AccountCurrentRow, AccountCurrentItemRow } from '@/types'

interface AccountCurrentViewerProps {
  ac: AccountCurrentRow
  items: AccountCurrentItemRow[]
  contractNo?: string
  counterpartyName?: string
}

const TX_TYPE_LABELS: Record<string, string> = {
  premium: '보험료',
  return_premium: '환급보험료',
  loss: '보험금',
  commission: '수수료',
  deposit_premium: '예치보험료',
  interest: '이자',
  adjustment: '조정',
}

const TX_SECTIONS = ['premium', 'loss', 'commission', 'other'] as const
type TxSection = typeof TX_SECTIONS[number]

function getSection(type: string): TxSection {
  if (type === 'premium' || type === 'return_premium' || type === 'deposit_premium') return 'premium'
  if (type === 'loss') return 'loss'
  if (type === 'commission') return 'commission'
  return 'other'
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function AccountCurrentViewer({
  ac,
  items,
  contractNo,
  counterpartyName,
}: AccountCurrentViewerProps) {
  const grouped: Record<TxSection, AccountCurrentItemRow[]> = {
    premium: [],
    loss: [],
    commission: [],
    other: [],
  }

  for (const item of items) {
    grouped[getSection(item.transaction_type)].push(item)
  }

  const sectionLabels: Record<TxSection, string> = {
    premium: '보험료',
    loss: '보험금',
    commission: '수수료',
    other: '기타',
  }

  const sectionSubtotals: Record<TxSection, number> = {
    premium: ac.subtotal_premium,
    loss: ac.subtotal_loss,
    commission: ac.subtotal_commission,
    other: ac.subtotal_other,
  }

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-mono">{ac.ac_no}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {contractNo ?? ac.contract_id.slice(0, 8)} · {counterpartyName ?? ac.counterparty_id.slice(0, 8)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {format(new Date(ac.period_from), 'yyyy-MM-dd')} ~{' '}
                {format(new Date(ac.period_to), 'yyyy-MM-dd')} ({ac.period_type})
              </p>
            </div>
            <div className="text-right space-y-1">
              <StatusBadge status={ac.status} />
              {ac.issued_at && (
                <p className="text-xs text-[var(--text-muted)]">
                  발행: {format(new Date(ac.issued_at), 'yyyy-MM-dd')}
                </p>
              )}
              {ac.due_date && (
                <p className="text-xs text-[var(--text-muted)]">
                  만기: {format(new Date(ac.due_date), 'yyyy-MM-dd')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B/F */}
      <div className="flex justify-between items-center rounded border border-border bg-surface px-4 py-2.5">
        <span className="text-sm text-[var(--text-secondary)]">이월잔액 (B/F)</span>
        <span className={`font-mono font-semibold text-[var(--text-number)] ${ac.balance_bf !== 0 ? '' : 'text-[var(--text-muted)]'}`}>
          {fmt(ac.balance_bf)} {ac.currency_code}
        </span>
      </div>

      {/* Sections */}
      {TX_SECTIONS.map((section) => {
        const sectionItems = grouped[section]
        if (sectionItems.length === 0) return null
        return (
          <Card key={section}>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm text-[var(--text-secondary)]">
                {sectionLabels[section]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated">
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">설명</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">유형</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)]">원화금액</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)]">정산금액 ({ac.currency_code})</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">방향</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.map((item, idx) => (
                    <tr
                      key={`${item.tx_id}-${idx}`}
                      className="border-b border-border hover:bg-surface-elevated"
                    >
                      <td className="px-4 py-2 text-[var(--text-primary)]">
                        {item.description ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                        {TX_TYPE_LABELS[item.transaction_type] ?? item.transaction_type}
                      </td>
                      <td className="px-4 py-2 font-mono text-right text-[var(--text-number)]">
                        {fmt(item.amount_original)} {item.currency_code}
                      </td>
                      <td className="px-4 py-2 font-mono text-right text-[var(--text-number)]">
                        {fmt(item.amount_settlement_currency)}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {item.direction === 'receivable' ? (
                          <span className="text-success">수취</span>
                        ) : (
                          <span className="text-warning-urgent">지급</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center px-4 py-2 bg-surface-elevated">
                <span className="text-xs text-[var(--text-muted)]">소계</span>
                <span className="font-mono text-sm font-semibold text-[var(--text-number)]">
                  {fmt(sectionSubtotals[section])} {ac.currency_code}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Net Balance */}
      <Separator />
      <div className="space-y-2">
        <div className="flex justify-between items-center px-4 py-2.5 rounded border border-border bg-surface">
          <span className="text-sm text-[var(--text-secondary)]">순잔액 (Net Balance)</span>
          <span
            className={`font-mono font-bold text-xl tabular-nums ${
              ac.net_balance >= 0 ? 'text-primary' : 'text-warning-urgent'
            }`}
          >
            {fmt(ac.net_balance)} {ac.currency_code}
          </span>
        </div>
        <div className="flex justify-end">
          <span className="text-sm text-[var(--text-secondary)]">
            {ac.direction === 'to_reinsurer' ? (
              <span className="text-accent">→ 수재사 지급</span>
            ) : (
              <span className="text-success">→ 출재사 수취</span>
            )}
          </span>
        </div>
      </div>

      {ac.notes && (
        <div className="rounded border border-border bg-surface px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">비고</p>
          <p className="text-sm text-[var(--text-primary)]">{ac.notes}</p>
        </div>
      )}
    </div>
  )
}
