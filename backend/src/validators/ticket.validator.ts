import { z } from 'zod';
import { Priority, Status } from '@prisma/client';

export const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required').default('General'),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(Status),
  reason: z.string().optional(),
});

export const updateTicketPrioritySchema = z.object({
  priority: z.nativeEnum(Priority),
});

export const assignTicketSchema = z.object({
  agentId: z.string().uuid('Valid agent ID is required').nullable(),
});

export const ticketQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? Math.max(1, parseInt(v, 10)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10))) : 10)),
  search: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  category: z.string().optional(),
  assignedAgentId: z.string().optional(),
  customerId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'ticketNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
