import { z } from 'zod'

export const CounterpartyCreateSchema = z.object({
  company_code: z.string().min(1, '회사 코드는 필수입니다.'),
  company_name_ko: z.string().min(1, '회사명(한글)은 필수입니다.'),
  company_name_en: z.string().min(1, '회사명(영문)은 필수입니다.'),
  company_type: z.enum(['cedant', 'reinsurer', 'both', 'broker']),
  country_code: z.string().nullable().optional(),
  default_currency: z.string().length(3).nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type CounterpartyCreateInput = z.infer<typeof CounterpartyCreateSchema>

export const CounterpartyUpdateSchema = CounterpartyCreateSchema.partial()

export type CounterpartyUpdateInput = z.infer<typeof CounterpartyUpdateSchema>
