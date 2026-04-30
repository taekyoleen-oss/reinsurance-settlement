'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { PremiumBordereauRow, LossBordereauRow } from '@/types/database'

// ─── 검증 상태 뱃지 ───────────────────────────

function ValidationBadge({ status }: { status: string }) {
  const cfg = {
    valid:   { label: '정상',     cls: 'bg-success/15 text-success border-success/30' },
    warning: { label: '경고',     cls: 'bg-warning-urgent/15 text-warning-urgent border-warning-urgent/30' },
    error:   { label: '오류',     cls: 'bg-destructive/15 text-destructive border-destructive/30' },
    pending: { label: '미검증',   cls: 'bg-surface-elevated text-[var(--text-muted)] border-border' },
  }[status] ?? { label: status, cls: 'bg-surface-elevated text-[var(--text-muted)] border-border' }

  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function fmtNum(n: number, currency = '') {
  return `${currency ? currency + ' ' : ''}${n.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── Premium Bordereau 테이블 ─────────────────

interface PremiumTableProps {
  rows: PremiumBordereauRow[]
  onSelect?: (row: PremiumBordereauRow) => void
}

export function PremiumBordereauTable({ rows, onSelect }: PremiumTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
        <p className="text-sm">보험료 명세가 없습니다.</p>
        <p className="text-xs mt-1">상단의 버튼으로 명세를 추가하세요.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-surface-elevated text-[var(--text-muted)] text-left">
            <th className="px-3 py-2 font-medium">회계기간</th>
            <th className="px-3 py-2 font-medium">증권번호</th>
            <th className="px-3 py-2 font-medium">피보험자</th>
            <th className="px-3 py-2 font-medium">위험기간</th>
            <th className="px-3 py-2 font-medium text-right">보험가입금액</th>
            <th className="px-3 py-2 font-medium text-right">원보험료</th>
            <th className="px-3 py-2 font-medium text-right">출재율</th>
            <th className="px-3 py-2 font-medium text-right">출재보험료</th>
            <th className="px-3 py-2 font-medium">처리구분</th>
            <th className="px-3 py-2 font-medium">검증</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onSelect?.(row)}
              className={cn(
                'border-b border-border hover:bg-surface-elevated/50 transition-colors',
                onSelect && 'cursor-pointer'
              )}
            >
              <td className="px-3 py-2 font-mono text-xs">{row.period_yyyyqn}</td>
              <td className="px-3 py-2 font-mono">{row.policy_no}</td>
              <td className="px-3 py-2">{row.insured_name ?? '-'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-[var(--text-muted)]">
                {row.risk_period_from} ~ {row.risk_period_to}
              </td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.sum_insured)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.original_premium, row.currency)}</td>
              <td className="px-3 py-2 text-right font-mono">{(row.cession_pct * 100).toFixed(2)}%</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{fmtNum(row.ceded_premium, row.currency)}</td>
              <td className="px-3 py-2">
                <EntryTypeBadge type={row.entry_type} />
              </td>
              <td className="px-3 py-2">
                <ValidationBadge status={row.validation_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EntryTypeBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; variant: 'default' | 'primary' | 'destructive' | 'accent' }> = {
    new:        { label: '신규',   variant: 'primary' },
    cancel:     { label: '취소',   variant: 'destructive' },
    refund:     { label: '환급',   variant: 'accent' },
    adjustment: { label: '조정',   variant: 'default' },
  }
  const c = cfg[type] ?? { label: type, variant: 'default' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ─── Loss Bordereau 테이블 ────────────────────

interface LossTableProps {
  rows: LossBordereauRow[]
  onSelect?: (row: LossBordereauRow) => void
}

export function LossBordereauTable({ rows, onSelect }: LossTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
        <p className="text-sm">손해 명세가 없습니다.</p>
        <p className="text-xs mt-1">상단의 버튼으로 명세를 추가하세요.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-surface-elevated text-[var(--text-muted)] text-left">
            <th className="px-3 py-2 font-medium">회계기간</th>
            <th className="px-3 py-2 font-medium">사고번호</th>
            <th className="px-3 py-2 font-medium">사고일</th>
            <th className="px-3 py-2 font-medium text-right">지급보험금</th>
            <th className="px-3 py-2 font-medium text-right">미결손해</th>
            <th className="px-3 py-2 font-medium text-right">출재율</th>
            <th className="px-3 py-2 font-medium text-right">재보험금 회수</th>
            <th className="px-3 py-2 font-medium">Cash Loss</th>
            <th className="px-3 py-2 font-medium">손해상태</th>
            <th className="px-3 py-2 font-medium">검증</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onSelect?.(row)}
              className={cn(
                'border-b border-border hover:bg-surface-elevated/50 transition-colors',
                onSelect && 'cursor-pointer'
              )}
            >
              <td className="px-3 py-2 font-mono text-xs">{row.period_yyyyqn}</td>
              <td className="px-3 py-2 font-mono">{row.claim_no}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.loss_date}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.paid_amount, row.currency)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.os_reserve, row.currency)}</td>
              <td className="px-3 py-2 text-right font-mono">{(row.cession_pct * 100).toFixed(2)}%</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{fmtNum(row.recoverable_amount, row.currency)}</td>
              <td className="px-3 py-2">
                {row.is_cash_loss ? (
                  <span className="inline-flex items-center rounded border border-warning-urgent/30 bg-warning-urgent/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-urgent">
                    Cash Loss
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                <LossStatusBadge status={row.loss_status} />
              </td>
              <td className="px-3 py-2">
                <ValidationBadge status={row.validation_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LossStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    in_progress: { label: '진행중',    cls: 'border-primary/30 bg-primary/10 text-primary' },
    paid:        { label: '지급완료',  cls: 'border-success/30 bg-success/10 text-success' },
    closed:      { label: '종결',      cls: 'border-border bg-surface-elevated text-[var(--text-muted)]' },
    denied:      { label: '거절',      cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
  }
  const c = cfg[status] ?? { label: status, cls: 'border-border bg-surface-elevated text-[var(--text-muted)]' }
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium', c.cls)}>
      {c.label}
    </span>
  )
}
