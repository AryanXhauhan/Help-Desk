import { Priority, Status, Role, ActivityAction, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AuthenticatedUser, PaginationParams } from '../types/index.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { generateTicketNumber } from '../utils/ticketNumber.js';
import { emitToTicket, emitToAgents, emitToUser } from '../socket/index.js';
import { cacheService } from '../config/redis.js';
import { dispatchNotification } from '../jobs/index.js';

const SLA_HOURS_MAP: Record<Priority, number> = {
  [Priority.URGENT]: 4,
  [Priority.HIGH]: 12,
  [Priority.MEDIUM]: 24,
  [Priority.LOW]: 48,
};

export class TicketService {
  static async createTicket(
    user: AuthenticatedUser,
    data: {
      subject: string;
      description: string;
      category?: string;
      priority?: Priority;
      dueDate?: string | null;
    }
  ) {
    const priority = data.priority || Priority.MEDIUM;
    const slaHours = SLA_HOURS_MAP[priority];
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          subject: data.subject,
          description: data.description,
          category: data.category || 'General',
          priority,
          status: Status.OPEN,
          customerId: user.id,
          slaDeadline,
          dueDate,
        },
        include: {
          customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          userId: user.id,
          action: ActivityAction.TICKET_CREATED,
          details: {
            subject: ticket.subject,
            priority: ticket.priority,
            category: ticket.category,
          },
        },
      });

      return ticket;
    });

    // Invalidate dashboard metrics cache
    await cacheService.delPattern('dashboard:*');

    // Notify agents of new ticket
    emitToAgents('ticket:created', result);

    return result;
  }

  static async getTickets(
    user: AuthenticatedUser,
    params: PaginationParams & { customerId?: string }
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    // Strict customer isolation: Customers only see their own tickets
    if (user.role === Role.CUSTOMER) {
      where.customerId = user.id;
    } else {
      // Agents and Admins can filter by specific customer
      if (params.customerId) {
        where.customerId = params.customerId;
      }
    }

    // Role-specific view: If an agent asks for assigned only
    if (params.assignedAgentId) {
      if (params.assignedAgentId === 'unassigned') {
        where.assignedAgentId = null;
      } else {
        where.assignedAgentId = params.assignedAgentId;
      }
    }

    if (params.status) {
      where.status = params.status as Status;
    }

    if (params.priority) {
      where.priority = params.priority as Priority;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { ticketNumber: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.TicketOrderByWithRelationInput = {
      [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
    };

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      tickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getTicketById(ticketId: string, user: AuthenticatedUser) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket not found`);
    }

    // Customer isolation check
    if (user.role === Role.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenError('You do not have permission to view this ticket');
    }

    return ticket;
  }

  static async updateStatus(
    ticketId: string,
    user: AuthenticatedUser,
    newStatus: Status,
    reason?: string
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedAgent: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Customers can only reopen resolved/closed tickets, or close their own tickets
    if (user.role === Role.CUSTOMER) {
      if (ticket.customerId !== user.id) {
        throw new ForbiddenError('You do not have permission to modify this ticket');
      }

      const isReopening =
        (ticket.status === Status.RESOLVED || ticket.status === Status.CLOSED) &&
        newStatus === Status.OPEN;
      const isClosing = newStatus === Status.CLOSED;

      if (!isReopening && !isClosing) {
        throw new BadRequestError('Customers can only close or reopen eligible tickets');
      }
    }

    const oldStatus = ticket.status;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.TicketUpdateInput = {
        status: newStatus,
      };

      if (newStatus === Status.RESOLVED) {
        updateData.resolvedAt = now;
      } else if (newStatus === Status.CLOSED) {
        updateData.closedAt = now;
      } else if (newStatus === Status.OPEN && (oldStatus === Status.RESOLVED || oldStatus === Status.CLOSED)) {
        // Reopened ticket
        updateData.resolvedAt = null;
        updateData.closedAt = null;
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      const action =
        newStatus === Status.RESOLVED
          ? ActivityAction.TICKET_RESOLVED
          : newStatus === Status.CLOSED
          ? ActivityAction.TICKET_CLOSED
          : oldStatus === Status.RESOLVED || oldStatus === Status.CLOSED
          ? ActivityAction.TICKET_REOPENED
          : ActivityAction.STATUS_UPDATED;

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: user.id,
          action,
          details: {
            from: oldStatus,
            to: newStatus,
            reason: reason || undefined,
            updatedBy: user.name,
            updatedByRole: user.role,
          },
        },
      });

      return updated;
    });

    // Invalidate dashboard metrics cache
    await cacheService.delPattern('dashboard:*');

    // Notify parties
    const notifyUserId = user.id === ticket.customerId ? ticket.assignedAgentId : ticket.customerId;
    if (notifyUserId) {
      await dispatchNotification({
        userId: notifyUserId,
        title: `Ticket ${ticket.ticketNumber} Status Updated`,
        message: `Status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
        type: NotificationType.STATUS_CHANGED,
        link: `/tickets/${ticket.id}`,
      });
    }

    emitToTicket(ticketId, 'ticket:status_changed', {
      ticketId,
      oldStatus,
      newStatus,
      updatedBy: user.name,
    });

    return result;
  }

  static async updatePriority(
    ticketId: string,
    user: AuthenticatedUser,
    newPriority: Priority
  ) {
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenError('Customers cannot alter ticket priority');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const oldPriority = ticket.priority;
    const slaHours = SLA_HOURS_MAP[newPriority];
    const slaDeadline = new Date(ticket.createdAt.getTime() + slaHours * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          priority: newPriority,
          slaDeadline,
        },
        include: {
          customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: user.id,
          action: ActivityAction.PRIORITY_UPDATED,
          details: {
            from: oldPriority,
            to: newPriority,
            updatedBy: user.name,
          },
        },
      });

      return updated;
    });

    await cacheService.delPattern('dashboard:*');

    emitToTicket(ticketId, 'ticket:priority_changed', {
      ticketId,
      oldPriority,
      newPriority,
      updatedBy: user.name,
    });

    return result;
  }

  static async assignTicket(
    ticketId: string,
    user: AuthenticatedUser,
    agentId: string | null
  ) {
    // Only Admin or Agent can assign
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenError('Customers cannot assign tickets');
    }

    // Support Agent can only assign to themselves or unassign themselves
    if (user.role === Role.AGENT && agentId !== null && agentId !== user.id) {
      throw new ForbiddenError('Support agents can only assign tickets to themselves');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedAgent: true },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    let agent = null;
    if (agentId) {
      agent = await prisma.user.findUnique({
        where: { id: agentId },
      });

      if (!agent || (agent.role !== Role.AGENT && agent.role !== Role.ADMIN)) {
        throw new BadRequestError('Assigned user must be an active Support Agent or Admin');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: agentId,
          // If ticket was OPEN and is now assigned, advance to IN_PROGRESS
          status: ticket.status === Status.OPEN && agentId ? Status.IN_PROGRESS : ticket.status,
        },
        include: {
          customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: user.id,
          action: ActivityAction.AGENT_ASSIGNED,
          details: {
            assignedAgentId: agentId,
            assignedAgentName: agent ? agent.name : 'Unassigned',
            assignedBy: user.name,
          },
        },
      });

      return updated;
    });

    await cacheService.delPattern('dashboard:*');

    if (agentId) {
      await dispatchNotification({
        userId: agentId,
        title: `Ticket Assigned: ${ticket.ticketNumber}`,
        message: `You have been assigned to ticket '${ticket.subject}'`,
        type: NotificationType.TICKET_ASSIGNED,
        link: `/tickets/${ticket.id}`,
      });
    }

    emitToTicket(ticketId, 'ticket:assigned', {
      ticketId,
      assignedAgent: result.assignedAgent,
    });

    return result;
  }

  static async getTicketActivity(ticketId: string, user: AuthenticatedUser) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (user.role === Role.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenError('You do not have permission to view activity for this ticket');
    }

    const activities = await prisma.ticketActivity.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
    });

    return activities;
  }
}
