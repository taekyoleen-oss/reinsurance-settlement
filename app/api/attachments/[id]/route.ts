import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/error-handler'

const BUCKET = 'attachments'

/**
 * GET /api/attachments/[id]
 * 첨부파일 다운로드용 서명 URL 반환 (1시간 유효)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminClient as any
    const { data: attachment, error } = await db
      .from('rs_attachments')
      .select('file_path, file_name')
      .eq('id', id)
      .single()

    if (error || !attachment) {
      return NextResponse.json({ error: '첨부파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    const { data: signedData, error: signError } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(attachment.file_path, 3600, {
        download: attachment.file_name,
      })

    if (signError || !signedData) throw signError ?? new Error('서명 URL 생성 실패')

    return NextResponse.json({ url: signedData.signedUrl })
  } catch (err) {
    return handleApiError(err)
  }
}

/**
 * DELETE /api/attachments/[id]
 * Storage에서 파일 삭제 + DB 레코드 삭제
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser()
    const { id } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminClient as any
    const { data: attachment, error: fetchError } = await db
      .from('rs_attachments')
      .select('file_path, uploaded_by')
      .eq('id', id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: '첨부파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (attachment.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: '본인이 업로드한 파일만 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    await adminClient.storage.from(BUCKET).remove([attachment.file_path])

    const { error: dbError } = await db.from('rs_attachments').delete().eq('id', id)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
