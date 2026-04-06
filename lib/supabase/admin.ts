import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// SERVICE_ROLE_KEY 사용 — 서버사이드 전용 (RLS 우회)
// 클라이언트 컴포넌트에서 절대 import 금지
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
