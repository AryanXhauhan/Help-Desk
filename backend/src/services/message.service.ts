import { MessageType, Role, Status, ActivityAction, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AuthenticatedUser } from '../types/index.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { emitToTicket } from '../socket/index.js';
import { dispatchNotification } from '../jobs/index.js';

export class MessageService {
  static async getMessages(ticketId: string, user: AuthenticatedUser) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (user.role === Role.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenError('You do not have permission to view messages for this ticket');
    }

    const where: Prisma.TicketMessageWhereInput = {
      ticketId,
    };

    // CRITICAL SECURITY ENFORCEMENT:
    // Customers must NEVER see internal notes.
    if (user.role === Role.CUSTOMER) {
      where.isInternal = false;
    }

    const messages = await prisma.ticketMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messages;
  }

  static async createMessage(
    ticketId: string,
    user: AuthenticatedUser,
    data: { body: string; isInternal?: boolean }
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

    if (user.role === Role.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenError('You do not have permission to reply to this ticket');
    }

    // Customers can NEVER post internal notes
    const isInternal = user.role === Role.CUSTOMER ? false : Boolean(data.isInternal);

    let messageType: MessageType;
    if (isInternal) {
      messageType = MessageType.INTERNAL_NOTE;
    } else if (user.role === Role.CUSTOMER) {
      messageType = MessageType.CUSTOMER_REPLY;
    } else {
      messageType = MessageType.AGENT_REPLY;
    }

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId: user.id,
          messageType,
          body: data.body,
          isInternal,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Log activity
      const activityAction = isInternal
        ? ActivityAction.INTERNAL_NOTE_ADDED
        : user.role === Role.CUSTOMER
        ? ActivityAction.CUSTOMER_REPLIED
        : ActivityAction.AGENT_REPLIED;

      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: user.id,
          action: activityAction,
          details: {
            messageId: message.id,
            isInternal,
            authorName: user.name,
          },
        },
      });

      // Smart status progression:
      // If customer replies and ticket was WAITING_FOR_CUSTOMER, switch to IN_PROGRESS
      if (user.role === Role.CUSTOMER && ticket.status === Status.WAITING_FOR_CUSTOMER) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: Status.IN_PROGRESS },
        });
      }

      // If agent replies publicly and ticket was OPEN, move to IN_PROGRESS
      if (user.role !== Role.CUSTOMER && !isInternal && ticket.status === Status.OPEN) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: Status.IN_PROGRESS },
        });
      }

      return message;
    });

    // Real-time broadcast
    if (isInternal) {
      // Internal note: dispatch only to agents and admins
      emitToTicket(ticketId, 'message:created', result, true);
    } else {
      // Public reply: dispatch to all subscribed to ticket
      emitToTicket(ticketId, 'message:created', result, false);

      // Notify other party
      if (user.role === Role.CUSTOMER) {
        // Customer replied -> notify assigned agent (or all agents if unassigned)
        if (ticket.assignedAgentId) {
          await dispatchNotification({
            userId: ticket.assignedAgentId,
            title: `New Reply on ${ticket.ticketNumber}`,
            message: `${user.name}: "${data.body.slice(0, 100)}${data.body.length > 100 ? '...' : ''}"`,
            type: NotificationType.NEW_REPLY,
            link: `/tickets/${ticket.id}`,
          });
        }
      } else {
        // Agent replied -> notify customer
        await dispatchNotification({
          userId: ticket.customerId,
          title: `Update on your ticket ${ticket.ticketNumber}`,
          message: `${user.name} replied to your ticket.`,
          type: NotificationType.NEW_REPLY,
          link: `/tickets/${ticket.id}`,
        });
      }
    }

    return result;
  }
}
