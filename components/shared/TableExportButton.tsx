'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Copy, Check } from 'lucide-react'

type CellValue = string | number | null | undefined
type ExportRow = CellValue[]

function escapeCSV(v: CellValue): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function toCSV(headers: string[], rows: ExportRow[]): string {
  return [headers.map(escapeCSV), ...rows.map((r) => r.map(escapeCSV))]
    .map((cells) => cells.join(','))
    .join('\n')
}

function toTSV(headers: string[], rows: ExportRow[]): string {
  return [headers, ...rows.map((r) => r.map((v) => (v == null ? '' : String(v))))]
    .map((cells) => cells.join('\t'))
    .join('\n')
}

interface TableExportButtonProps {
  headers: string[]
  rows: ExportRow[]
  filename?: string
}

export function TableExportButton({ headers, rows, filename = 'export' }: TableExportButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    // BOM(﻿) 추가 — Excel에서 한글 깨짐 방지
    const csv = '﻿' + toCSV(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toTSV(headers, rows))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable (non-HTTPS 등) — 무시
    }
  }

  if (rows.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)]">{rows.length}건</span>
      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        {copied ? '복사됨' : '클립보드 복사'}
      </Button>
      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleDownload}>
        <Download className="h-3 w-3" />
        CSV 다운로드
      </Button>
    </div>
  )
}
