import { z } from 'zod'

export const ExchangeRateCreateSchema = z.object({
  from_currency: z.string().length(3),
  to_currency: z.string().length(3).optional(),
  rate: z.number().positive('환율은 양수여야 합니다.'),
  rate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.'),
  rate_type: z.enum(['spot', 'monthly_avg', 'custom']),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type ExchangeRateCreateInput = z.infer<typeof ExchangeRateCreateSchema>

export const ExchangeRateUpdateSchema = ExchangeRateCreateSchema.partial()

export type ExchangeRateUpdateInput = z.infer<typeof ExchangeRateUpdateSchema>
