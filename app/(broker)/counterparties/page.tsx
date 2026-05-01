'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import type { CounterpartyRow } from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data ?? [])

const TYPE_LABELS: Record<string, string> = {
  reinsurer: '수재사',
  cedant: '출재사',
  broker: '브로커',
}

const CP_URL = '/api/counterparties'

export default function CounterpartiesPage() {
  const { data: counterparties = [], isLoading: loading } = useSWR<CounterpartyRow[]>(CP_URL, fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<CounterpartyRow | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [form, setForm] = useState({
    company_code: '',
    company_name_ko: '',
    company_name_en: '',
    company_type: 'reinsurer',
    country_code: '',
    contact_email: '',
    default_currency: '',
  })

  const resetForm = () => setForm({
    company_code: '',
    company_name_ko: '',
    company_name_en: '',
    company_type: 'reinsurer',
    country_code: '',
    contact_email: '',
    default_currency: '',
  })


  const openEdit = (cp: CounterpartyRow) => {
    setEditTarget(cp)
    setForm({
      company_code: cp.company_code,
      company_name_ko: cp.company_name_ko,
      company_name_en: cp.company_name_en,
      company_type: cp.company_type,
      country_code: cp.country_code ?? '',
      contact_email: cp.contact_email ?? '',
      default_currency: cp.default_currency ?? '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name_ko) { toast.error('회사명(한글)을 입력하세요.'); return }
    setFormLoading(true)
    try {
      const url = editTarget ? `/api/counterparties/${editTarget.id}` : '/api/counterparties'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      toast.success(editTarget ? '수정되었습니다.' : '등록되었습니다.')
      setShowForm(false)
      setEditTarget(null)
      resetForm()
      mutate(CP_URL)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setFormLoading(false)
    }
  }

  const filtered = counterparties.filter((cp) => {
    if (filterType !== 'all' && cp.company_type !== filterType) return false
    if (search && !cp.company_name_ko.toLowerCase().includes(search.toLowerCase()) && !cp.company_name_en.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">거래상대방 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">출재사, 수재사, 브로커 마스터 관리</p>
        </div>
        <Button onClick={() => { setEditTarget(null); resetForm(); setShowForm(!showForm) }}>
          <Plus className="h-4 w-4 mr-1" />
          거래상대방 등록
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editTarget ? '거래상대방 수정' : '거래상대방 등록'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>회사 코드</Label>
                <Input value={form.company_code} onChange={(e) => setForm((f) => ({ ...f, company_code: e.target.value }))} placeholder="ABC-001" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select value={form.company_type} onValueChange={(v) => setForm((f) => ({ ...f, company_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reinsurer">수재사</SelectItem>
                    <SelectItem value="cedant">출재사</SelectItem>
                    <SelectItem value="broker">브로커</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>회사명 (한글) *</Label>
                <Input value={form.company_name_ko} onChange={(e) => setForm((f) => ({ ...f, company_name_ko: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>회사명 (영문)</Label>
                <Input value={form.company_name_en} onChange={(e) => setForm((f) => ({ ...f, company_name_en: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>국가 코드</Label>
                <Input value={form.country_code} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value.toUpperCase() }))} placeholder="KR, US..." className="w-24 font-mono" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label>기본 통화</Label>
                <Input value={form.default_currency} onChange={(e) => setForm((f) => ({ ...f, default_currency: e.target.value.toUpperCase() }))} placeholder="KRW, USD..." className="w-24 font-mono" maxLength={3} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>이메일</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={formLoading}>{formLoading ? '저장 중...' : '저장'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Input placeholder="회사명 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="reinsurer">수재사</SelectItem>
            <SelectItem value="cedant">출재사</SelectItem>
            <SelectItem value="broker">브로커</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>회사명 (KO)</TableHead>
              <TableHead>회사명 (EN)</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>국가</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((cp) => (
              <TableRow key={cp.id}>
                <TableCell className="font-mono text-xs">{cp.company_code}</TableCell>
                <TableCell className="font-medium">{cp.company_name_ko}</TableCell>
                <TableCell className="text-sm text-[var(--text-secondary)]">{cp.company_name_en}</TableCell>
                <TableCell>
                  <Badge variant={cp.company_type === 'reinsurer' ? 'accent' : cp.company_type === 'cedant' ? 'default' : 'default'}>
                    {TYPE_LABELS[cp.company_type] ?? cp.company_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{cp.country_code ?? '-'}</TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">{cp.contact_email ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(cp)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    수정
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">거래상대방 없음</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
