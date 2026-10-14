import { z } from 'zod';

export const createMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(10000),
  isInternal: z.boolean().default(false),
});
