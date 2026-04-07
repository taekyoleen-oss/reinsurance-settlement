# 스킬: pdf-exporter

## 목적
정산서 PDF 출력 및 거래내역 Excel 다운로드 로직을 제공한다.

## 보고서 종류 (4종)
1. **정산서 PDF**: Account Current 항목 + 서명란
2. **미청산 현황 리포트**: 거래상대방별 Outstanding 현황
3. **거래내역 Excel**: 기간별 전체 거래 내역 (xlsx)
4. **Aging 분석 리포트**: Current/30/60/90/90+일 버킷별 분석

## PDF 출력 규칙
- 출력 시 라이트 테마 강제 (`@media print { :root { ... } }`)
- `jspdf` + `jspdf-autotable` 사용
- 한국어 지원: 폰트 내장 필요

## 구현

### 정산서 PDF (`lib/utils/pdf.ts`)

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function exportACPDF(acId: string): Promise<Blob> {
  // 1. AC 데이터 + items 조회
  // 2. jsPDF 문서 생성
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // 헤더
  doc.setFontSize(16)
  doc.text('Account Current', 105, 20, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`AC No: ${ac.ac_no}`, 20, 35)
  doc.text(`발행일: ${ac.issued_at?.slice(0, 10) ?? '-'}`, 20, 42)
  doc.text(`정산 기간: ${ac.period_from} ~ ${ac.period_to}`, 20, 49)
  doc.text(`수재사: ${counterparty.company_name_ko}`, 20, 56)

  // 항목 테이블
  autoTable(doc, {
    startY: 65,
    head: [['항목', '방향', '금액', '통화']],
    body: items.map(item => [
      item.description ?? item.transaction_type,
      item.direction === 'receivable' ? '수취' : '지급',
      formatAmount(item.amount_original, item.currency_code),
      item.currency_code,
    ]),
    foot: [['Net Balance', '', formatAmount(ac.net_balance, ac.currency_code), ac.currency_code]],
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [0, 201, 167] },  // primary color
    footStyles: { fontStyle: 'bold' },
  })

  // 서명란
  const finalY = (doc as any).lastAutoTable.finalY + 20
  doc.text('브로커 서명: _______________', 20, finalY)
  doc.text('날짜: _______________', 120, finalY)

  return doc.output('blob')
}
```

### Excel 출력 (`lib/utils/excel.ts`)

```typescript
import * as XLSX from 'xlsx'

export async function exportTransactionsExcel(params: {
  from: string
  to: string
  counterpartyId?: string
}): Promise<Blob> {
  // 거래 데이터 조회
  // XLSX 워크시트 생성

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 20 },  // 거래번호
    { wch: 15 },  // 날짜
    { wch: 15 },  // 거래유형
    { wch: 20 },  // 거래상대방
    { wch: 15 },  // 금액
    { wch: 8 },   // 통화
    { wch: 10 },  // 상태
  ]

  XLSX.utils.book_append_sheet(wb, ws, '거래내역')
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
```

### UI 다운로드 버튼 패턴

```typescript
// 클라이언트 컴포넌트
async function handleDownload(type: 'pdf' | 'excel') {
  const response = await fetch(`/api/reports/${type}?acId=${acId}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = type === 'pdf' ? `AC-${acNo}.pdf` : `transactions-${date}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
```

## 보고서 Route Handler

```typescript
// app/api/reports/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')  // 'ac-pdf' | 'outstanding' | 'transactions' | 'aging'

  switch (type) {
    case 'ac-pdf':     return streamPDF(await exportACPDF(searchParams.get('acId')!))
    case 'outstanding': return streamPDF(await exportOutstandingReport())
    case 'transactions': return streamExcel(await exportTransactionsExcel({
      from: searchParams.get('from')!,
      to: searchParams.get('to')!,
    }))
    case 'aging':      return streamPDF(await exportAgingReport())
  }
}
```
