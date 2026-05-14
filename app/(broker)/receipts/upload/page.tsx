'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, AlertTriangle, CheckCircle2, Save } from 'lucide-react'
import type { MatchedLine } from '@/app/api/receipts/upload/route'

const SAMPLE_CSV =
  'date,amount,currency,reference,memo,direction\n2026-05-01,250000,USD,SWIFT-TRT-2025-001-Q1,한국화재보험 1Q,inbound\n2026-05-03,200000,USD,SWIFT-TRT-2025-002,DB손해 송금,outbound'

interface CSVRow {
  date: string
  amount: number
  currency: string
  reference?: string
  memo?: string
  direction: 'inbound' | 'outbound'
}

function parseCSV(text: string): { rows: CSVRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], errors: ['CSV 가 비어있습니다.'] }
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const idx = (k: string) => header.indexOf(k)
  const dateI = idx('date')
  const amtI = idx('amount')
  const curI = idx('currency')
  const refI = idx('reference')
  const memoI = idx('memo')
  const dirI = idx('direction')
  if (dateI < 0 || amtI < 0 || curI < 0 || dirI < 0) {
    return {
      rows: [],
      errors: ['헤더에 date,amount,currency,direction 이 모두 있어야 합니다.'],
    }
  }
  const rows: CSVRow[] = []
  const errors: string[] = []
  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',').map((c) => c.trim())
    const dir = cols[dirI]
    if (dir !== 'inbound' && dir !== 'outbound') {
      errors.push(`row ${i + 2}: direction 은 inbound/outbound 만 가능 (${dir})`)
      return
    }
    const amt = parseFloat(cols[amtI])
    if (!isFinite(amt) || amt <= 0) {
      errors.push(`row ${i + 2}: amount 가 올바르지 않음 (${cols[amtI]})`)
      return
    }
    rows.push({
      date: cols[dateI],
      amount: amt,
      currency: cols[curI].toUpperCase(),
      reference: refI >= 0 ? cols[refI] : undefined,
      memo: memoI >= 0 ? cols[memoI] : undefined,
      direction: dir,
    })
  })
  return { rows, errors }
}

export default function ReceiptsUploadPage() {
  const [csvText, setCsvText] = useState('')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [matched, setMatched] = useState<MatchedLine[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)

  const handleParse = async () => {
    const { rows, errors } = parseCSV(csvText)
    setParseErrors(errors)
    if (rows.length === 0) {
      setMatched([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/receipts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: rows.map((r, i) => ({ ...r, index: i })),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(typeof j?.error === 'string' ? j.error : '매칭 실패')
        return
      }
      const json = await res.json()
      setMatched(json.data ?? [])
      toast.success(`${rows.length}건 매칭 후보 추출 완료`)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    setCsvText(text)
  }

  const handleImport = async (idx: number) => {
    const m = matched[idx]
    if (!m.best_candidate) {
      toast.error('매칭 후보가 없습니다.')
      return
    }
    const c = m.best_candidate
    setImporting(idx)
    try {
      // 거래상대방 ID 가 필요 — 계약 상세에서 cedant 사용
      const cRes = await fetch(`/api/contracts/${c.contract_id}`)
      const cJson = await cRes.json()
      const cedantId = cJson.data?.cedant_id
      if (!cedantId) {
        toast.error('거래상대방을 찾을 수 없습니다.')
        return
      }
      const endpoint =
        c.schedule_type === 'premium'
          ? `/api/contracts/${c.contract_id}/schedules/${c.schedule_id}/receipts`
          : `/api/contracts/${c.contract_id}/schedules/${c.schedule_id}/loss-receipts`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterparty_id: cedantId,
          direction: m.direction,
          received_date: m.date,
          received_amount: m.amount,
          received_currency: m.currency,
          exchange_rate: 1,
          bank_reference: m.reference || undefined,
          receipt_note: m.memo || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(typeof j?.error === 'string' ? j.error : '저장 실패')
        return
      }
      toast.success(`row ${m.index + 1} 등록 완료`)
      // 해당 row 의 후보를 비워서 중복 등록 방지
      setMatched((prev) =>
        prev.map((x, i) => (i === idx ? { ...x, candidates: [], best_candidate: undefined } : x))
      )
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
          <Upload className="h-5 w-5 text-blue-500" />
          은행 거래내역 일괄 업로드
        </h1>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          은행에서 받은 CSV 거래내역을 붙여넣으면 활성 계약·기간의 미수령 스케줄과 자동 매칭합니다.
          확인 후 1건씩 등록하면 premium / loss receipt 로 저장됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. CSV 입력</CardTitle>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            헤더: <code>date, amount, currency, reference, memo, direction</code>
            (direction = inbound / outbound)
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCsvText(SAMPLE_CSV)}
              className="h-8 text-xs whitespace-nowrap"
            >
              샘플 불러오기
            </Button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="CSV 데이터를 붙여넣으세요"
            className="h-32 w-full rounded border border-border bg-background p-2 font-mono text-[11px]"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleParse} disabled={loading || !csvText.trim()}>
              {loading ? '매칭 중...' : '매칭 분석 실행'}
            </Button>
          </div>
          {parseErrors.length > 0 && (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              파싱 오류:
              <ul className="mt-1 list-disc pl-4">
                {parseErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {matched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. 매칭 결과 ({matched.length}건)</CardTitle>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              점수: 통화 일치 30 / 금액 정확 일치 50 / 계약번호 포함 30 / 출재사명 포함 15 / 납기
              ±7일 15
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="w-24">날짜</TableHead>
                  <TableHead className="w-16">구분</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>참조/메모</TableHead>
                  <TableHead>최적 매칭 후보</TableHead>
                  <TableHead className="w-16 text-center">등록</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matched.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-[var(--text-muted)]">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{m.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.direction === 'inbound' ? 'success' : 'warning'}
                        className="text-[9px]"
                      >
                        {m.direction === 'inbound' ? '입금' : '출금'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {m.currency} {m.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-[11px] text-[var(--text-muted)]">
                      <div className="font-mono">{m.reference ?? '–'}</div>
                      <div className="text-[10px]">{m.memo ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.best_candidate ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-mono">{m.best_candidate.contract_no}</span>
                            <span className="text-[var(--text-muted)]">·</span>
                            <span>{m.best_candidate.period_label}</span>
                            <Badge
                              variant={
                                m.best_candidate.score >= 80
                                  ? 'success'
                                  : m.best_candidate.score >= 50
                                    ? 'warning'
                                    : 'muted'
                              }
                              className="text-[9px]"
                            >
                              {m.best_candidate.score}점
                            </Badge>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {m.best_candidate.cedant_name ?? '–'} · 잔액{' '}
                            {m.best_candidate.outstanding_amount.toLocaleString()} ·{' '}
                            {m.best_candidate.reason.join(' · ')}
                          </div>
                          {m.candidates.length > 1 && (
                            <div className="text-[10px] text-[var(--text-muted)]">
                              + 후보 {m.candidates.length - 1}건
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">매칭 없음</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {m.best_candidate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleImport(i)}
                          disabled={importing === i}
                        >
                          {importing === i ? (
                            '...'
                          ) : (
                            <>
                              <Save className="mr-0.5 h-3 w-3" />
                              등록
                            </>
                          )}
                        </Button>
                      ) : (
                        <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-[var(--text-muted)]" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
