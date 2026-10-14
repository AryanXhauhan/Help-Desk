import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:,.<>])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});
