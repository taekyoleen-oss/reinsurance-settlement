import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/error-handler'
import type { AttachmentEntityType } from '@/types'

const BUCKET = 'attachments'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/zip',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

function isAllowedMime(mime: string) {
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))
}

async function ensureBucket() {
  const { data: buckets } = await adminClient.storage.listBuckets()
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await adminClient.storage.createBucket(BUCKET, { public: false })
  }
}

/**
 * GET /api/attachments?entity_type=transaction&entity_id=<uuid>
 * 특정 엔터티의 첨부파일 목록 반환
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entity_type') as AttachmentEntityType | null
    const entityId = searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type, entity_id 필수' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminClient as any
    const { data, error } = await db
      .from('rs_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}

/**
 * POST /api/attachments
 * multipart/form-data: file, entity_type, entity_id, note?
 * 파일을 Supabase Storage에 업로드하고 메타데이터를 DB에 저장
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser()
    await ensureBucket()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entity_type') as AttachmentEntityType | null
    const entityId = formData.get('entity_id') as string | null
    const note = (formData.get('note') as string | null)?.trim() || null

    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type, entity_id 필수' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 20MB 이하이어야 합니다.' }, { status: 400 })
    }
    if (!isAllowedMime(file.type)) {
      return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 400 })
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9가-힣._\-]/g, '_')
    const storagePath = `${entityType}/${entityId}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2 = adminClient as any
    const { data, error: dbError } = await db2
      .from('rs_attachments')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        note,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      await adminClient.storage.from(BUCKET).remove([storagePath])
      throw dbError
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
