/** rs_contracts 행에 출재사 요약(한글명·코드)을 붙입니다. PostgREST 임베드 조인 대신 사용해 RLS/순환 이슈를 줄입니다. */

export type CedantSummary = { company_name_ko: string; company_code: string }

export async function attachCedantSummaries<T extends { cedant_id: string }>(
  db: { from: (t: string) => any },
  rows: T[]
): Promise<Array<T & { cedant: CedantSummary | null }>> {
  if (!rows.length) return rows as Array<T & { cedant: CedantSummary | null }>

  const ids = [...new Set(rows.map((r) => r.cedant_id).filter(Boolean))]
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, cedant: null })) as Array<T & { cedant: CedantSummary | null }>
  }

  const { data: cps, error } = await db
    .from('rs_counterparties')
    .select('id, company_name_ko, company_code')
    .in('id', ids)

  if (error) throw error

  const map = new Map<string, CedantSummary>(
    (cps ?? []).map((c: { id: string; company_name_ko: string; company_code: string }) => [
      c.id,
      { company_name_ko: c.company_name_ko, company_code: c.company_code },
    ])
  )

  return rows.map((r) => ({
    ...r,
    cedant: map.get(r.cedant_id) ?? null,
  })) as Array<T & { cedant: CedantSummary | null }>
}
