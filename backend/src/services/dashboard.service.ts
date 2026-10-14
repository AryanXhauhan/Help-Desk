import { Status, Priority, Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { cacheService } from '../config/redis.js';
import { AuthenticatedUser } from '../types/index.js';

export class DashboardService {
  static async getMetrics(user: AuthenticatedUser) {
    const cacheKey = `dashboard:metrics:${user.role}:${user.id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Continue to fresh calculation
      }
    }

    const now = new Date();
    const whereBase: any = {};

    // If customer, only compute metrics for their tickets
    if (user.role === Role.CUSTOMER) {
      whereBase.customerId = user.id;
    } else if (user.role === Role.AGENT) {
      // Agents see team overview or assigned
    }

    // 1. Overall counts
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      closedTickets,
      overdueTickets,
    ] = await Promise.all([
      prisma.ticket.count({ where: whereBase }),
      prisma.ticket.count({ where: { ...whereBase, status: Status.OPEN } }),
      prisma.ticket.count({ where: { ...whereBase, status: Status.IN_PROGRESS } }),
      prisma.ticket.count({ where: { ...whereBase, status: Status.WAITING_FOR_CUSTOMER } }),
      prisma.ticket.count({ where: { ...whereBase, status: Status.RESOLVED } }),
      prisma.ticket.count({ where: { ...whereBase, status: Status.CLOSED } }),
      prisma.ticket.count({
        where: {
          ...whereBase,
          status: { in: [Status.OPEN, Status.IN_PROGRESS, Status.WAITING_FOR_CUSTOMER] },
          slaDeadline: { lte: now },
        },
      }),
    ]);

    // 2. Average resolution time (hours)
    const resolvedRecords = await prisma.ticket.findMany({
      where: {
        ...whereBase,
        status: { in: [Status.RESOLVED, Status.CLOSED] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
      take: 200,
    });

    let avgResolutionHours = 0;
    if (resolvedRecords.length > 0) {
      const totalHours = resolvedRecords.reduce((acc, t) => {
        if (!t.resolvedAt) return acc;
        const diffMs = t.resolvedAt.getTime() - t.createdAt.getTime();
        return acc + diffMs / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = parseFloat((totalHours / resolvedRecords.length).toFixed(1));
    }

    // 3. Priority distribution
    const [lowCount, mediumCount, highCount, urgentCount] = await Promise.all([
      prisma.ticket.count({ where: { ...whereBase, priority: Priority.LOW } }),
      prisma.ticket.count({ where: { ...whereBase, priority: Priority.MEDIUM } }),
      prisma.ticket.count({ where: { ...whereBase, priority: Priority.HIGH } }),
      prisma.ticket.count({ where: { ...whereBase, priority: Priority.URGENT } }),
    ]);

    const priorityDistribution = [
      { name: 'Low', count: lowCount, color: '#10B981' },
      { name: 'Medium', count: mediumCount, color: '#3B82F6' },
      { name: 'High', count: highCount, color: '#F59E0B' },
      { name: 'Urgent', count: urgentCount, color: '#EF4444' },
    ];

    // 4. Status distribution
    const statusDistribution = [
      { name: 'Open', count: openTickets, color: '#3B82F6' },
      { name: 'In Progress', count: inProgressTickets, color: '#8B5CF6' },
      { name: 'Waiting on Customer', count: waitingTickets, color: '#F59E0B' },
      { name: 'Resolved', count: resolvedTickets, color: '#10B981' },
      { name: 'Closed', count: closedTickets, color: '#6B7280' },
    ];

    // 5. Volume over time (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const recentTickets = await prisma.ticket.findMany({
      where: {
        ...whereBase,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group into date map
    const volumeByDayMap: Record<string, { created: number; resolved: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      volumeByDayMap[key] = { created: 0, resolved: 0 };
    }

    recentTickets.forEach((t) => {
      const key = t.createdAt.toISOString().split('T')[0];
      if (volumeByDayMap[key]) {
        volumeByDayMap[key].created += 1;
        if (t.status === Status.RESOLVED || t.status === Status.CLOSED) {
          volumeByDayMap[key].resolved += 1;
        }
      }
    });

    const ticketVolumeOverTime = Object.entries(volumeByDayMap).map(([date, counts]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created: counts.created,
      resolved: counts.resolved,
    }));

    // 6. Agent Workload (Admins and Agents)
    let agentWorkload: any[] = [];
    if (user.role !== Role.CUSTOMER) {
      const agents = await prisma.user.findMany({
        where: { role: { in: [Role.AGENT, Role.ADMIN] }, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          assignedTickets: {
            select: {
              status: true,
              createdAt: true,
              resolvedAt: true,
            },
          },
        },
      });

      agentWorkload = agents.map((agent) => {
        const total = agent.assignedTickets.length;
        const open = agent.assignedTickets.filter(
          (t) => t.status === Status.OPEN || t.status === Status.IN_PROGRESS || t.status === Status.WAITING_FOR_CUSTOMER
        ).length;
        const resolved = agent.assignedTickets.filter(
          (t) => t.status === Status.RESOLVED || t.status === Status.CLOSED
        ).length;

        const resolvedWithTimes = agent.assignedTickets.filter((t) => t.resolvedAt !== null);
        let agentAvgHours = 0;
        if (resolvedWithTimes.length > 0) {
          const totalMs = resolvedWithTimes.reduce(
            (sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()),
            0
          );
          agentAvgHours = parseFloat((totalMs / (resolvedWithTimes.length * 3600000)).toFixed(1));
        }

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          avatarUrl: agent.avatarUrl,
          totalAssigned: total,
          openTickets: open,
          resolvedTickets: resolved,
          avgResolutionHours: agentAvgHours,
        };
      });
    }

    const metrics = {
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        waitingTickets,
        resolvedTickets,
        closedTickets,
        overdueTickets,
        avgResolutionHours,
      },
      priorityDistribution,
      statusDistribution,
      ticketVolumeOverTime,
      agentWorkload,
    };

    // Cache metrics for 60 seconds
    await cacheService.set(cacheKey, JSON.stringify(metrics), 60);

    return metrics;
  }
}
