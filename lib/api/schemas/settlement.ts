import { z } from 'zod'

export const SettlementCreateSchema = z.object({
  settlement_type: z.enum(['receipt', 'payment']),
  counterparty_id: z.string().uuid(),
  amount: z.number().positive('금액은 양수여야 합니다.'),
  currency_code: z.string().length(3),
  settlement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.'),
  bank_reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type SettlementCreateInput = z.infer<typeof SettlementCreateSchema>

export const SettlementMatchSchema = z.object({
  settlement_id: z.string().uuid(),
  ac_id: z.string().uuid(),
  matched_amount: z.number().positive(),
  tx_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type SettlementMatchInput = z.infer<typeof SettlementMatchSchema>
