'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Paperclip, Upload, X, Download, Trash2, FileText, ImageIcon, File } from 'lucide-react'
import type { AttachmentEntityType, AttachmentRow } from '@/types/database'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <File className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 shrink-0 text-red-400" />
  return <FileText className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
}

// ── 스테이징 파일 행 ─────────────────────────────────────────────────────────

function StagedFileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm">
      <FileIcon mime={file.type || null} />
      <span className="flex-1 truncate text-[var(--text-primary)]">{file.name}</span>
      <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatFileSize(file.size)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── 기존 첨부 행 ─────────────────────────────────────────────────────────────

function AttachmentRow_({
  attachment,
  onDelete,
}: {
  attachment: AttachmentRow
  onDelete: (id: string) => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/attachments/${attachment.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '다운로드 실패')
      window.open(data.url, '_blank')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${attachment.file_name}"을 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/attachments/${attachment.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '삭제 실패')
      toast.success('첨부파일이 삭제되었습니다.')
      onDelete(attachment.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
      <FileIcon mime={attachment.mime_type} />
      <span className="flex-1 truncate text-[var(--text-primary)]" title={attachment.file_name}>
        {attachment.file_name}
      </span>
      {attachment.note && (
        <span className="shrink-0 max-w-[10rem] truncate text-xs text-[var(--text-muted)]">
          {attachment.note}
        </span>
      )}
      <span className="shrink-0 text-xs text-[var(--text-muted)]">
        {formatFileSize(attachment.file_size)}
      </span>
      <span className="shrink-0 text-xs text-[var(--text-muted)]">
        {new Date(attachment.created_at).toLocaleDateString('ko-KR')}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={handleDownload}
        disabled={downloading}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface AttachmentSectionProps {
  entityType: AttachmentEntityType
  /** entityId가 없으면 스테이징 모드 — 파일 선택만 하고 실제 업로드는 부모가 처리 */
  entityId?: string
  /** 스테이징 모드에서 선택된 파일 목록이 바뀔 때 호출 */
  onStagedFilesChange?: (files: File[]) => void
  className?: string
}

export function AttachmentSection({
  entityType,
  entityId,
  onStagedFilesChange,
  className,
}: AttachmentSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  // 기존 첨부 로드 (live 모드)
  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    fetch(`/api/attachments?entity_type=${entityType}&entity_id=${entityId}`)
      .then((r) => r.json())
      .then((d) => setAttachments(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entityType, entityId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    if (newFiles.length === 0) return

    if (entityId) {
      // live 모드: 즉시 업로드
      uploadFiles(newFiles)
    } else {
      // 스테이징 모드: 목록에 추가
      setStagedFiles((prev) => {
        const updated = [...prev, ...newFiles]
        onStagedFilesChange?.(updated)
        return updated
      })
    }
    e.target.value = ''
  }

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!entityId) return
      setUploading(true)
      let successCount = 0
      for (const file of files) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('entity_type', entityType)
          fd.append('entity_id', entityId)
          const note = noteMap[file.name]
          if (note) fd.append('note', note)

          const res = await fetch('/api/attachments', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? '업로드 실패')
          setAttachments((prev) => [data.data, ...prev])
          successCount++
        } catch (err: unknown) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      if (successCount > 0) toast.success(`${successCount}개 파일이 첨부되었습니다.`)
      setUploading(false)
      setNoteMap({})
    },
    [entityId, entityType, noteMap]
  )

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      onStagedFilesChange?.(updated)
      return updated
    })
  }

  const handleDeleteExisting = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const isEmpty = entityId ? attachments.length === 0 : stagedFiles.length === 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            별첨
            {entityId && attachments.length > 0 && (
              <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                ({attachments.length}개)
              </span>
            )}
            {!entityId && stagedFiles.length > 0 && (
              <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                ({stagedFiles.length}개 선택됨)
              </span>
            )}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5" />
            파일 추가
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
            onChange={handleFileChange}
          />
        </div>
        {!entityId && (
          <p className="text-xs text-[var(--text-muted)]">
            저장 완료 후 자동으로 첨부됩니다. PDF, Excel, Word, 이미지, ZIP (최대 20MB)
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* 스테이징 모드 파일 목록 */}
        {!entityId &&
          stagedFiles.map((file, i) => (
            <StagedFileRow
              key={`${file.name}-${i}`}
              file={file}
              onRemove={() => removeStagedFile(i)}
            />
          ))}

        {/* Live 모드 파일 목록 */}
        {entityId && loading && (
          <p className="text-xs text-[var(--text-muted)] animate-pulse py-2">로딩 중...</p>
        )}
        {entityId &&
          !loading &&
          attachments.map((a) => (
            <AttachmentRow_ key={a.id} attachment={a} onDelete={handleDeleteExisting} />
          ))}

        {uploading && (
          <p className="text-xs text-[var(--text-muted)] animate-pulse py-2">업로드 중...</p>
        )}

        {isEmpty && !loading && !uploading && (
          <p className="text-xs text-[var(--text-muted)] py-2 text-center">
            첨부된 파일이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── 스테이징된 파일을 실제 업로드하는 유틸 함수 ───────────────────────────────

export async function uploadStagedFiles(
  entityType: AttachmentEntityType,
  entityId: string,
  files: File[]
): Promise<void> {
  for (const file of files) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('entity_type', entityType)
    fd.append('entity_id', entityId)
    const res = await fetch('/api/attachments', { method: 'POST', body: fd })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(`${file.name}: ${d.error ?? '업로드 실패'}`)
    }
  }
}
