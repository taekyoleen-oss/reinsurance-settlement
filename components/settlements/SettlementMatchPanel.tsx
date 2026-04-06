'use client'

import { useEffect, useState, useCallback } from 'react'
import { useDrop, useDrag, DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { SettlementRow, AccountCurrentRow } from '@/types'

const ITEM_TYPE = 'SETTLEMENT'

interface SettlementItemProps {
  settlement: SettlementRow
}

function SettlementItem({ settlement }: SettlementItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: settlement,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n)

  return (
    <div
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>}
      className={`rounded border border-border bg-surface-elevated p-3 cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-[var(--text-secondary)]">{settlement.settlement_no}</span>
        <Badge variant={settlement.settlement_type === 'receipt' ? 'success' : 'destructive'}>
          {settlement.settlement_type === 'receipt' ? '입금' : '출금'}
        </Badge>
      </div>
      <div className="font-mono text-sm font-semibold text-[var(--text-number)]">
        {fmt(settlement.amount)} {settlement.currency_code}
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-1">
        {format(new Date(settlement.settlement_date), 'yyyy-MM-dd')}
      </div>
    </div>
  )
}

interface ACDropTargetProps {
  ac: AccountCurrentRow
  onDrop: (settlement: SettlementRow, ac: AccountCurrentRow) => void
}

function ACDropTarget({ ac, onDrop }: ACDropTargetProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: SettlementRow) => onDrop(item, ac),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n)

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`rounded border-2 border-dashed p-3 transition-colors ${
        isOver ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-[var(--text-secondary)]">{ac.ac_no}</span>
        <Badge variant={ac.direction === 'to_reinsurer' ? 'accent' : 'success'}>
          {ac.direction === 'to_reinsurer' ? '→수재사' : '→출재사'}
        </Badge>
      </div>
      <div className="font-mono text-sm font-semibold text-[var(--text-number)]">
        {fmt(ac.net_balance)} {ac.currency_code}
      </div>
      {isOver && (
        <p className="text-xs text-primary mt-1">여기에 드롭하여 매칭</p>
      )}
    </div>
  )
}

export function SettlementMatchPanel() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [acs, setAcs] = useState<AccountCurrentRow[]>([])
  const [matchDialog, setMatchDialog] = useState<{
    settlement: SettlementRow
    ac: AccountCurrentRow
  } | null>(null)
  const [matchAmount, setMatchAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(() => {
    fetch('/api/settlements?match_status=unmatched,partial')
      .then((r) => r.json())
      .then((d) => setSettlements(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})

    fetch('/api/account-currents?status=issued')
      .then((r) => r.json())
      .then((d) => setAcs(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDrop = (settlement: SettlementRow, ac: AccountCurrentRow) => {
    setMatchAmount(String(Math.min(settlement.amount - settlement.matched_amount, Math.abs(ac.net_balance))))
    setMatchDialog({ settlement, ac })
  }

  const handleMatch = async () => {
    if (!matchDialog) return
    setSaving(true)
    try {
      const res = await fetch('/api/settlements/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: matchDialog.settlement.id,
          ac_id: matchDialog.ac.id,
          matched_amount: parseFloat(matchAmount),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '매칭 실패')
        return
      }
      toast.success('매칭이 완료되었습니다.')
      setMatchDialog(null)
      loadData()
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">미매칭 결제 (드래그하여 매칭)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settlements.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">미매칭 결제 없음</p>
            ) : (
              settlements.map((s) => <SettlementItem key={s.id} settlement={s} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">발행된 정산서 (드롭 대상)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">발행된 정산서 없음</p>
            ) : (
              acs.map((ac) => <ACDropTarget key={ac.id} ac={ac} onDrop={handleDrop} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!matchDialog} onOpenChange={() => setMatchDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>결제 매칭 금액 입력</DialogTitle>
          </DialogHeader>
          {matchDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-border bg-surface p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">결제</p>
                  <p className="font-mono font-semibold">{matchDialog.settlement.settlement_no}</p>
                  <p className="font-mono text-[var(--text-number)]">
                    {matchDialog.settlement.amount.toLocaleString()} {matchDialog.settlement.currency_code}
                  </p>
                </div>
                <div className="rounded border border-border bg-surface p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">정산서</p>
                  <p className="font-mono font-semibold">{matchDialog.ac.ac_no}</p>
                  <p className="font-mono text-[var(--text-number)]">
                    {matchDialog.ac.net_balance.toLocaleString()} {matchDialog.ac.currency_code}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>매칭 금액</Label>
                <Input
                  type="number"
                  value={matchAmount}
                  onChange={(e) => setMatchAmount(e.target.value)}
                  className="font-mono text-right"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialog(null)}>취소</Button>
            <Button onClick={handleMatch} disabled={saving || !matchAmount}>
              {saving ? '처리 중...' : '매칭 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndProvider>
  )
}
