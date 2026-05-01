import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const TransactionCreateSchema = z.object({
  contract_id: z.string().uuid(),
  contract_type: z.enum(['treaty', 'facultative']),
  transaction_type: z.enum([
    'premium',
    'return_premium',
    'loss',
    'commission',
    'deposit_premium',
    'interest',
    'adjustment',
  ]),
  direction: z.enum(['receivable', 'payable']),
  counterparty_id: z.string().uuid(),
  amount_original: z.number().positive('금액은 양수여야 합니다.'),
  currency_code: z.string().length(3),
  transaction_date: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD입니다.'),
  due_date: z.string().regex(dateRegex).nullable().optional(),
  period_from: z.string().regex(dateRegex).nullable().optional(),
  period_to: z.string().regex(dateRegex).nullable().optional(),
  loss_reference: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  // allocation_method는 UI-only, DB 컬럼이 아님
  allocation_method: z.enum(['auto', 'manual']).optional(),
  allocation_type: z.enum(['auto', 'manual']).optional(),
})

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>

export const TransactionUpdateSchema = z.object({
  status: z
    .enum(['draft', 'confirmed', 'billed', 'settled', 'cancelled'])
    .optional(),
  description: z.string().nullable().optional(),
  due_date: z.string().regex(dateRegex).nullable().optional(),
  amount_original: z.number().positive().optional(),
  transaction_date: z.string().regex(dateRegex).optional(),
})

export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>

export const AllocatePreviewSchema = z.object({
  contract_id: z.string().uuid(),
  transaction_date: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD입니다.'),
  amount_original: z.number().positive(),
  currency_code: z.string().length(3),
})

export type AllocatePreviewInput = z.infer<typeof AllocatePreviewSchema>
