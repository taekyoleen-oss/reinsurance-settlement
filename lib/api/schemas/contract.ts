import { z } from 'zod'

export const ContractCreateSchema = z.object({
  contract_no: z.string().min(1, '계약 번호는 필수입니다.'),
  contract_type: z.enum(['treaty', 'facultative']),
  treaty_type: z.enum(['proportional', 'non_proportional']).nullable().optional(),
  class_of_business: z
    .enum(['fire', 'marine', 'liability', 'engineering', 'misc'])
    .nullable()
    .optional(),
  cedant_id: z.string().uuid('cedant_id는 UUID여야 합니다.'),
  inception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.'),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.')
    .nullable()
    .optional(),
  settlement_currency: z.string().length(3, '통화 코드는 3자리입니다.'),
  settlement_period: z.enum(['quarterly', 'semiannual', 'annual', 'adhoc']),
  description: z.string().nullable().optional(),
  broker_id: z.string().uuid().nullable().optional(),
  underwriting_basis: z.enum(['UY', 'clean_cut']).nullable().optional(),
  ceding_commission_rate: z.number().min(0).max(100).nullable().optional(),
  profit_commission_rate: z.number().min(0).max(100).nullable().optional(),
  brokerage_rate: z.number().min(0).max(100).nullable().optional(),
  premium_reserve_rate: z.number().min(0).max(100).nullable().optional(),
  loss_reserve_rate: z.number().min(0).max(100).nullable().optional(),
  interest_rate: z.number().min(0).max(100).nullable().optional(),
  reserve_release_timing: z.enum(['next_period', 'period_after_next']).nullable().optional(),
  payment_due_days: z.number().int().min(0).nullable().optional(),
  confirmation_due_days: z.number().int().min(0).nullable().optional(),
  offset_allowed: z.boolean().optional(),
  cash_loss_threshold: z.number().min(0).nullable().optional(),
})

export type ContractCreateInput = z.infer<typeof ContractCreateSchema>

export const ContractUpdateSchema = ContractCreateSchema.partial()

export type ContractUpdateInput = z.infer<typeof ContractUpdateSchema>

export const ContractShareCreateSchema = z.object({
  reinsurer_id: z.string().uuid(),
  signed_line: z.number().min(0).max(100),
  order_of_priority: z.number().int().min(1),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export type ContractShareCreateInput = z.infer<typeof ContractShareCreateSchema>
