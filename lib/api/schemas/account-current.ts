import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const ACCreateSchema = z.object({
  contract_id: z.string().uuid(),
  counterparty_id: z.string().uuid(),
  period_type: z.enum(['quarterly', 'semiannual', 'annual', 'adhoc']),
  period_from: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD입니다.'),
  period_to: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD입니다.'),
  currency_code: z.string().length(3),
  settlementCurrency: z.string().length(3),
  due_date: z.string().regex(dateRegex).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type ACCreateInput = z.infer<typeof ACCreateSchema>

export const ACUpdateSchema = z.object({
  notes: z.string().nullable().optional(),
  status: z
    .enum(['draft', 'pending_approval', 'approved', 'issued', 'acknowledged', 'disputed', 'cancelled'])
    .optional(),
})

export type ACUpdateInput = z.infer<typeof ACUpdateSchema>
