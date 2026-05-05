'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, BarChart3, Download, Table2, Info } from 'lucide-react'

type CellValue = string | number | null | undefined

function escapeCSV(v: CellValue): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCSV(headers: string[], rows: CellValue[][], filename: string) {
  const csv =
    '﻿' +
    [headers.map(escapeCSV), ...rows.map((r) => r.map(escapeCSV))]
      .map((cells) => cells.join(','))
      .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface CounterpartyOption {
  id: string
  company_name_ko: string
}

interface ContractOption {
  id: string
  contract_no: string
}

export default function ReportsPage() {
  const [counterparties, setCounterparties] = useState<CounterpartyOption[]>([])
  const [contracts, setContracts] = useState<ContractOption[]>([])

  // 미청산 리포트 params
  const [outCounterparty, setOutCounterparty] = useState('all')
  const [outContract, setOutContract] = useState('all')
  const [outLoading, setOutLoading] = useState(false)

  // Aging 리포트 params
  const [agingCounterparty, setAgingCounterparty] = useState('all')
  const [agingContract, setAgingContract] = useState('all')
  const [agingLoading, setAgingLoading] = useState(false)

  // 정산서 목록 params
  const [acDateFrom, setAcDateFrom] = useState('')
  const [acDateTo, setAcDateTo] = useState('')
  const [acCounterparty, setAcCounterparty] = useState('all')
  const [acStatus, setAcStatus] = useState('all')
  const [acLoading, setAcLoading] = useState(false)

  // 거래내역 params
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const [txCounterparty, setTxCounterparty] = useState('all')
  const [txContract, setTxContract] = useState('all')
  const [txLoading, setTxLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/counterparties').then((r) => r.json()),
      fetch('/api/contracts').then((r) => r.json()),
    ])
      .then(([cpData, ctData]) => {
        setCounterparties(cpData.data ?? [])
        setContracts(ctData.data ?? [])
      })
      .catch(() => {})
  }, [])

  const handleOutstandingDownload = async () => {
    setOutLoading(true)
    try {
      // 상세 미청산 데이터 사용 (거래상대방·계약·통화·방향 단위)
      const params = new URLSearchParams()
      params.set('type', 'detail')
      if (outCounterparty !== 'all') params.set('counterpartyId', outCounterparty)
      if (outContract !== 'all') params.set('contractId', outContract)

      const res = await fetch(`/api/outstanding?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회 실패')

      const rows = (json.data ?? []) as Record<string, unknown>[]
      const headers = [
        '거래상대방',
        '계약번호',
        '통화',
        '방향',
        '미청산금액',
        '만기일',
        'Aging구간',
      ]
      const csvRows = rows.map((r) => [
        r.counterparty_name,
        r.contract_no,
        r.currency_code,
        r.direction === 'receivable' ? '수취' : '지급',
        r.amount,
        r.due_date,
        r.aging_bucket,
      ])
      downloadCSV(headers, csvRows as CellValue[][], '미청산잔액')
      toast.success(`${rows.length}건 다운로드 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setOutLoading(false)
    }
  }

  const handleAgingDownload = async () => {
    setAgingLoading(true)
    try {
      const params = new URLSearchParams()
      if (agingCounterparty !== 'all') params.set('counterpartyId', agingCounterparty)
      if (agingContract !== 'all') params.set('contractId', agingContract)

      const res = await fetch(`/api/reports/aging?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회 실패')

      const rows = (json.data ?? []) as Record<string, unknown>[]
      const headers = [
        '거래상대방',
        '통화',
        '정상',
        '1-30일',
        '31-60일',
        '61-90일',
        '90일초과',
        '합계',
      ]
      const csvRows = rows.map((r) => [
        r.counterparty,
        r.currency,
        r.current,
        r.days_1_30,
        r.days_31_60,
        r.days_61_90,
        r.days_over_90,
        r.total,
      ])
      downloadCSV(headers, csvRows as CellValue[][], 'Aging리포트')
      toast.success(`${rows.length}건 다운로드 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setAgingLoading(false)
    }
  }

  const handleAcDownload = async () => {
    setAcLoading(true)
    try {
      const params = new URLSearchParams()
      if (acCounterparty !== 'all') params.set('counterpartyId', acCounterparty)
      if (acStatus !== 'all') params.set('status', acStatus)
      if (acDateFrom) params.set('dateFrom', acDateFrom)
      if (acDateTo) params.set('dateTo', acDateTo)

      const res = await fetch(`/api/reports/account-currents?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회 실패')

      const rows = (json.data ?? []) as Record<string, unknown>[]
      const headers = [
        '정산서번호',
        '계약ID',
        '수재사ID',
        '기간(시작)',
        '기간(종료)',
        'Net잔액',
        '방향',
        '상태',
        '발행일',
      ]
      const csvRows = rows.map((r) => [
        r.ac_no,
        r.contract_id,
        r.counterparty_id,
        r.period_from,
        r.period_to,
        r.net_balance,
        r.direction === 'to_reinsurer' ? '→수재사' : '←출재사',
        r.status,
        r.issued_at ? String(r.issued_at).slice(0, 10) : '',
      ])
      downloadCSV(headers, csvRows as CellValue[][], '정산서목록')
      toast.success(`${rows.length}건 다운로드 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setAcLoading(false)
    }
  }

  const handleTxDownload = async () => {
    setTxLoading(true)
    try {
      const params = new URLSearchParams()
      if (txCounterparty !== 'all') params.set('counterpartyId', txCounterparty)
      if (txContract !== 'all') params.set('contractId', txContract)
      if (txDateFrom) params.set('dateFrom', txDateFrom)
      if (txDateTo) params.set('dateTo', txDateTo)

      const res = await fetch(`/api/reports/transactions?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회 실패')

      const rows = (json.data ?? []) as Record<string, unknown>[]
      const headers = [
        '거래일',
        '계약번호',
        '거래상대방',
        '유형',
        '방향',
        '원화금액',
        '외화금액',
        '통화',
        '상태',
        '설명',
      ]
      const txTypeLabels: Record<string, string> = {
        premium: '보험료',
        return_premium: '환급보험료',
        loss: '손해',
        commission: '수수료',
        other: '기타',
      }
      const csvRows = rows.map((r) => [
        r.transaction_date ? String(r.transaction_date).slice(0, 10) : '',
        r.contract_id,
        r.counterparty_id,
        txTypeLabels[String(r.transaction_type)] ?? r.transaction_type,
        r.direction === 'receivable' ? '수취' : '지급',
        r.amount_krw,
        r.amount_original,
        r.currency_code,
        r.status,
        r.description,
      ])
      downloadCSV(headers, csvRows as CellValue[][], '거래내역')
      toast.success(`${rows.length}건 다운로드 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setTxLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">보고서</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          조건을 설정한 후 CSV 파일로 다운로드합니다.
        </p>
      </div>

      {/* 안내 배너 */}
      <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
        <div>
          <span className="font-medium text-[var(--text-primary)]">페이지별 직접 내보내기</span>도
          가능합니다. 정산서 관리·거래 관리·미청산 잔액 페이지에서 필터를 설정한 후 &ldquo;CSV
          다운로드&rdquo; 버튼을 사용하면 현재 화면 데이터를 바로 내보낼 수 있습니다. 정산서 PDF
          인쇄는 <strong>정산서 관리 → 상세 페이지</strong>의 PDF 버튼을 이용하세요.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 미청산 잔액 리포트 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              미청산 잔액 리포트
            </CardTitle>
            <CardDescription>거래상대방·통화별 미청산 잔액 CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">거래상대방</Label>
              <Select value={outCounterparty} onValueChange={setOutCounterparty}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.company_name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">특약/계약</Label>
              <Select value={outContract} onValueChange={setOutContract}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={handleOutstandingDownload}
              disabled={outLoading}
            >
              <Download className="mr-1 h-4 w-4" />
              {outLoading ? '생성 중...' : 'CSV 다운로드'}
            </Button>
          </CardContent>
        </Card>

        {/* Aging 리포트 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              Aging 리포트
            </CardTitle>
            <CardDescription>미청산 잔액 경과일 분석 CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">거래상대방</Label>
              <Select value={agingCounterparty} onValueChange={setAgingCounterparty}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.company_name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">특약/계약</Label>
              <Select value={agingContract} onValueChange={setAgingContract}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={handleAgingDownload}
              disabled={agingLoading}
            >
              <Download className="mr-1 h-4 w-4" />
              {agingLoading ? '생성 중...' : 'CSV 다운로드'}
            </Button>
          </CardContent>
        </Card>

        {/* 정산서 목록 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[var(--primary)]" />
              정산서 목록 CSV
            </CardTitle>
            <CardDescription>
              기간·수재사·상태별 정산서 목록 CSV (개별 PDF는 정산서 상세 페이지에서)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={acDateFrom}
                  onChange={(e) => setAcDateFrom(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={acDateTo}
                  onChange={(e) => setAcDateTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">수재사</Label>
              <Select value={acCounterparty} onValueChange={setAcCounterparty}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.company_name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">상태</Label>
              <Select value={acStatus} onValueChange={setAcStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="draft">임시저장</SelectItem>
                  <SelectItem value="pending_approval">승인 대기</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="issued">발행됨</SelectItem>
                  <SelectItem value="acknowledged">수신확인</SelectItem>
                  <SelectItem value="disputed">이의제기</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={handleAcDownload}
              disabled={acLoading}
            >
              <Download className="mr-1 h-4 w-4" />
              {acLoading ? '생성 중...' : 'CSV 다운로드'}
            </Button>
          </CardContent>
        </Card>

        {/* 거래내역 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-5 w-5 text-[var(--primary)]" />
              거래내역 CSV
            </CardTitle>
            <CardDescription>기간·거래상대방·특약별 거래내역 CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={txDateFrom}
                  onChange={(e) => setTxDateFrom(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={txDateTo}
                  onChange={(e) => setTxDateTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">거래상대방</Label>
              <Select value={txCounterparty} onValueChange={setTxCounterparty}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.company_name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">특약/계약</Label>
              <Select value={txContract} onValueChange={setTxContract}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={handleTxDownload}
              disabled={txLoading}
            >
              <Download className="mr-1 h-4 w-4" />
              {txLoading ? '생성 중...' : 'CSV 다운로드'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
