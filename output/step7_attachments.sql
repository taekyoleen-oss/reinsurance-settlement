-- =============================================================================
-- step7_attachments.sql
-- 별첨(첨부파일) 테이블 — 계약/거래/결제/정산서/명세에 파일 첨부 지원
-- =============================================================================
-- Supabase Storage 버킷 생성 필요:
--   Dashboard > Storage > New bucket > 이름: "attachments", Public: OFF
-- =============================================================================

CREATE TABLE IF NOT EXISTS rs_attachments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text        NOT NULL
                    CHECK (entity_type IN ('contract', 'transaction', 'settlement', 'account_current', 'bordereau')),
    entity_id   uuid        NOT NULL,
    file_name   text        NOT NULL,
    file_path   text        NOT NULL,       -- Supabase Storage 내부 경로
    file_size   bigint,                     -- bytes
    mime_type   text,
    note        text,                       -- 첨부 메모
    uploaded_by uuid        REFERENCES auth.users(id),
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rs_attachments IS '계약·거래·결제·정산서·명세에 첨부된 파일 메타데이터';

CREATE INDEX IF NOT EXISTS idx_rs_attachments_entity
    ON rs_attachments(entity_type, entity_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE rs_attachments ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 전체 조회 가능
CREATE POLICY "rs_attachments_select"
    ON rs_attachments FOR SELECT
    TO authenticated
    USING (true);

-- 인증된 사용자는 업로드 가능
CREATE POLICY "rs_attachments_insert"
    ON rs_attachments FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 업로드한 본인만 삭제 가능
CREATE POLICY "rs_attachments_delete"
    ON rs_attachments FOR DELETE
    TO authenticated
    USING (uploaded_by = auth.uid());
