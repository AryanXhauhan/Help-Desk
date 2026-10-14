import { Router } from 'express';
import { Role } from '@prisma/client';
import { TicketController } from '../controllers/ticket.controller.js';
import { MessageController } from '../controllers/message.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createTicketSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  assignTicketSchema,
  ticketQuerySchema,
} from '../validators/ticket.validator.js';
import { createMessageSchema } from '../validators/message.validator.js';

const router = Router();

// Ticket CRUD & Listing
router.post(
  '/',
  authenticate,
  validate({ body: createTicketSchema }),
  TicketController.createTicket
);

router.get(
  '/',
  authenticate,
  validate({ query: ticketQuerySchema as any }),
  TicketController.getTickets
);

router.get('/:id', authenticate, TicketController.getTicketById);

// State transitions & assignment
router.patch(
  '/:id/status',
  authenticate,
  validate({ body: updateTicketStatusSchema }),
  TicketController.updateStatus
);

router.patch(
  '/:id/priority',
  authenticate,
  requireRole(Role.ADMIN, Role.AGENT),
  validate({ body: updateTicketPrioritySchema }),
  TicketController.updatePriority
);

router.patch(
  '/:id/assign',
  authenticate,
  requireRole(Role.ADMIN, Role.AGENT),
  validate({ body: assignTicketSchema }),
  TicketController.assignTicket
);

router.get('/:id/activity', authenticate, TicketController.getTicketActivity);

// Ticket Messages & Internal Notes
router.get('/:id/messages', authenticate, MessageController.getMessages);

router.post(
  '/:id/messages',
  authenticate,
  validate({ body: createMessageSchema }),
  MessageController.createMessage
);

export default router;
