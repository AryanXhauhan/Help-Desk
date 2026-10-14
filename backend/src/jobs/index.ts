import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { isRedisConnected, redisClient } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { NotificationType, Status } from '@prisma/client';
import { emitToUser, emitToAgents } from '../socket/index.js';

let notificationQueue: Queue | null = null;
let slaQueue: Queue | null = null;
let notificationWorker: Worker | null = null;
let slaWorker: Worker | null = null;

// Initialize BullMQ Queues and Workers if Redis is available
export const initJobs = async () => {
  if (!isRedisConnected() || !redisClient) {
    logger.info('Redis is not connected. BullMQ background jobs will run in direct-dispatch mode.');
    startSlaFallbackInterval();
    return;
  }

  try {
    const connection = {
      host: redisClient.options.host || 'localhost',
      port: redisClient.options.port || 6379,
    };

    notificationQueue = new Queue('notifications', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    slaQueue = new Queue('sla-checks', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 50,
      },
    });

    // Worker for notifications
    notificationWorker = new Worker(
      'notifications',
      async (job: Job) => {
        const { userId, title, message, type, link } = job.data;
        logger.debug({ userId, type }, 'Processing background notification job');

        const notification = await prisma.notification.create({
          data: { userId, title, message, type, link },
        });

        // Real-time dispatch via Socket.IO
        emitToUser(userId, 'notification:received', notification);
        return notification;
      },
      { connection }
    );

    notificationWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Notification background job failed');
    });

    // Worker for SLA checks
    slaWorker = new Worker(
      'sla-checks',
      async () => {
        await checkSlaBreaches();
      },
      { connection }
    );

    slaWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'SLA check job failed');
    });

    // Schedule periodic SLA checks every 5 minutes
    await slaQueue.add('check-slas', {}, {
      repeat: { every: 5 * 60 * 1000 },
      jobId: 'sla-periodic-check',
    });

    logger.info('BullMQ background queues and workers initialized successfully');
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize BullMQ. Falling back to internal scheduler.');
    startSlaFallbackInterval();
  }
};

// Dispatch notification either via BullMQ or immediate write + socket emit
export const dispatchNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) => {
  try {
    if (notificationQueue && isRedisConnected()) {
      await notificationQueue.add('send-notification', data);
      return;
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to queue notification. Dispatching synchronously.');
  }

  // Fallback: synchronous persistence and socket emission
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      },
    });
    emitToUser(data.userId, 'notification:received', notification);
  } catch (error) {
    logger.error({ error }, 'Failed to dispatch notification directly');
  }
};

// Check for overdue SLA tickets
export const checkSlaBreaches = async () => {
  try {
    const now = new Date();

    // Find non-resolved/non-closed tickets past their SLA deadline
    const overdueTickets = await prisma.ticket.findMany({
      where: {
        status: { in: [Status.OPEN, Status.IN_PROGRESS, Status.WAITING_FOR_CUSTOMER] },
        slaDeadline: { lte: now },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true, email: true } },
      },
    });

    if (overdueTickets.length > 0) {
      logger.info({ count: overdueTickets.length }, 'Detected overdue SLA tickets');

      for (const ticket of overdueTickets) {
        // Notify assigned agent or all agents if unassigned
        const alertTitle = `⚠️ SLA Breach Alert: ${ticket.ticketNumber}`;
        const alertMessage = `Ticket '${ticket.subject}' has exceeded its SLA resolution deadline!`;

        if (ticket.assignedAgentId) {
          await dispatchNotification({
            userId: ticket.assignedAgentId,
            title: alertTitle,
            message: alertMessage,
            type: NotificationType.SLA_WARNING,
            link: `/tickets/${ticket.id}`,
          });
        }

        emitToAgents('ticket:sla_breached', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error executing SLA breach inspection');
  }
};

let fallbackTimer: NodeJS.Timeout | null = null;
const startSlaFallbackInterval = () => {
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = setInterval(() => {
    checkSlaBreaches().catch((err) => logger.error({ err }, 'SLA check interval error'));
  }, 5 * 60 * 1000); // every 5 minutes
};
