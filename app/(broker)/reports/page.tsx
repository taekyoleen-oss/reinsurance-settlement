'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, BarChart3, Download, Table2 } from 'lucide-react'

interface ReportConfig {
  type: string
  label: string
  description: string
  icon: React.ReactNode
  params: { label: string; key: string; type: string }[]
}

const REPORTS: ReportConfig[] = [
  {
    type: 'account_current_pdf',
    label: '정산서 PDF',
    description: '발행된 정산서를 PDF 형식으로 출력합니다.',
    icon: <FileText className="h-5 w-5" />,
    params: [
      { label: '정산서 ID', key: 'ac_id', type: 'text' },
    ],
  },
  {
    type: 'outstanding_report',
    label: '미청산 리포트',
    description: '통화별·거래상대방별 미청산 잔액 리포트입니다.',
    icon: <BarChart3 className="h-5 w-5" />,
    params: [
      { label: '기준일', key: 'as_of_date', type: 'date' },
    ],
  },
  {
    type: 'transaction_excel',
    label: '거래내역 Excel',
    description: '기간별 거래 내역을 Excel 파일로 내보냅니다.',
    icon: <Table2 className="h-5 w-5" />,
    params: [
      { label: '시작일', key: 'date_from', type: 'date' },
      { label: '종료일', key: 'date_to', type: 'date' },
    ],
  },
  {
    type: 'aging_report',
    label: 'Aging 리포트',
    description: '미청산 잔액의 Aging 분석 보고서입니다.',
    icon: <BarChart3 className="h-5 w-5" />,
    params: [
      { label: '기준일', key: 'as_of_date', type: 'date' },
      { label: '통화', key: 'currency', type: 'text' },
    ],
  },
]

export default function ReportsPage() {
  const [params, setParams] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const getParam = (type: string, key: string) => params[type]?.[key] ?? ''
  const setParam = (type: string, key: string, val: string) => {
    setParams((p) => ({ ...p, [type]: { ...(p[type] ?? {}), [key]: val } }))
  }

  const handleDownload = async (report: ReportConfig) => {
    setLoading((l) => ({ ...l, [report.type]: true }))
    try {
      const queryParams = new URLSearchParams(params[report.type] ?? {})
      const res = await fetch(`/api/reports/${report.type}?${queryParams}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '생성 실패')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = report.type.includes('excel') ? '.xlsx' : report.type.includes('pdf') ? '.pdf' : '.csv'
      a.download = `${report.type}_${new Date().toISOString().slice(0, 10)}${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('다운로드가 시작되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading((l) => ({ ...l, [report.type]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">보고서</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">각종 보고서를 생성하고 다운로드합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((report) => (
          <Card key={report.type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-[var(--primary)]">{report.icon}</span>
                {report.label}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.params.map((p) => (
                <div key={p.key} className="space-y-1.5">
                  <Label className="text-xs">{p.label}</Label>
                  <Input
                    type={p.type}
                    value={getParam(report.type, p.key)}
                    onChange={(e) => setParam(report.type, p.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => handleDownload(report)}
                disabled={loading[report.type]}
              >
                <Download className="h-4 w-4 mr-1" />
                {loading[report.type] ? '생성 중...' : '다운로드'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
