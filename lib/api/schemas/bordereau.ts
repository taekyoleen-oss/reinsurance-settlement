import { z } from 'zod'

export const BordereauUploadSchema = z.object({
  type: z.enum(['premium', 'loss'], {
    errorMap: () => ({ message: 'type은 premium 또는 loss이어야 합니다.' }),
  }),
  contract_id: z.string().uuid('contract_id는 UUID여야 합니다.'),
})

export type BordereauUploadInput = z.infer<typeof BordereauUploadSchema>
