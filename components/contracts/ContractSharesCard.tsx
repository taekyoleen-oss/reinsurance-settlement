'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { CounterpartyRow } from '@/types'

export interface ShareEntry {
  reinsurer_id: string
  signed_line: string
  effective_from: string
  effective_to: string
}

interface Props {
  shares: ShareEntry[]
  reinsurers: CounterpartyRow[]
  totalSignedLine: number
  onChange: (shares: ShareEntry[]) => void
}

export function ContractSharesCard({ shares, reinsurers, totalSignedLine, onChange }: Props) {
  const updateShare = (idx: number, key: keyof ShareEntry, value: string) => {
    const next = shares.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
    onChange(next)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          지분율 (합계:{' '}
          <span className={Math.abs(totalSignedLine - 100) < 0.01 ? 'text-success' : 'text-warning-urgent'}>
            {totalSignedLine.toFixed(2)}%
          </span>
          )
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => onChange([...shares, { reinsurer_id: '', signed_line: '', effective_from: '', effective_to: '' }])}
        >
          <Plus className="h-3 w-3 mr-1" /> 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {shares.map((share, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-3 items-end">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">수재사</Label>
              <Select value={share.reinsurer_id} onValueChange={(v) => updateShare(idx, 'reinsurer_id', v)}>
                <SelectTrigger><SelectValue placeholder="수재사 선택" /></SelectTrigger>
                <SelectContent>
                  {reinsurers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.company_name_ko}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">지분율 (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={share.signed_line}
                onChange={(e) => updateShare(idx, 'signed_line', e.target.value)}
                className="font-mono text-right"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">유효기간 시작</Label>
              <Input type="date" value={share.effective_from} onChange={(e) => updateShare(idx, 'effective_from', e.target.value)} />
            </div>
            <div className="flex items-end gap-1">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">유효기간 종료</Label>
                <Input type="date" value={share.effective_to} onChange={(e) => updateShare(idx, 'effective_to', e.target.value)} />
              </div>
              {shares.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-warning-urgent"
                  onClick={() => onChange(shares.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
