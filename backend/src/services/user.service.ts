import { Role, Status, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';

export class UserService {
  static async getUsers(params: {
    page?: number;
    limit?: number;
    role?: Role;
    search?: string;
    isActive?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              customerTickets: true,
              assignedTickets: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  }

  static async getAgents() {
    return prisma.user.findMany({
      where: {
        role: { in: [Role.AGENT, Role.ADMIN] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  static async updateUser(
    id: string,
    data: { name?: string; role?: Role; isActive?: boolean }
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  static async getAgentPerformance(agentId?: string) {
    const whereAgent: Prisma.UserWhereInput = {
      role: { in: [Role.AGENT, Role.ADMIN] },
      isActive: true,
    };

    if (agentId) {
      whereAgent.id = agentId;
    }

    const agents = await prisma.user.findMany({
      where: whereAgent,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        assignedTickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            slaDeadline: true,
          },
        },
      },
    });

    return agents.map((agent) => {
      const tickets = agent.assignedTickets;
      const totalAssigned = tickets.length;
      const openCount = tickets.filter(
        (t) => t.status === Status.OPEN || t.status === Status.IN_PROGRESS || t.status === Status.WAITING_FOR_CUSTOMER
      ).length;
      const resolvedCount = tickets.filter(
        (t) => t.status === Status.RESOLVED || t.status === Status.CLOSED
      ).length;

      // SLA Compliance
      let metSlaCount = 0;
      let eligibleForSlaCount = 0;
      tickets.forEach((t) => {
        if (t.resolvedAt && t.slaDeadline) {
          eligibleForSlaCount += 1;
          if (t.resolvedAt <= t.slaDeadline) {
            metSlaCount += 1;
          }
        }
      });

      const slaComplianceRate =
        eligibleForSlaCount > 0 ? Math.round((metSlaCount / eligibleForSlaCount) * 100) : 100;

      // Average Resolution Time
      const resolvedWithTimes = tickets.filter((t) => t.resolvedAt !== null);
      let avgResolutionHours = 0;
      if (resolvedWithTimes.length > 0) {
        const totalDuration = resolvedWithTimes.reduce(
          (sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()),
          0
        );
        avgResolutionHours = parseFloat((totalDuration / (resolvedWithTimes.length * 3600000)).toFixed(1));
      }

      return {
        agentId: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        avatarUrl: agent.avatarUrl,
        totalAssigned,
        openCount,
        resolvedCount,
        slaComplianceRate,
        avgResolutionHours,
      };
    });
  }
}
