import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Role } from '@prisma/client';

export class UserController {
  static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const role = req.query.role as Role | undefined;
      const search = req.query.search as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await UserService.getUsers({ page, limit, role, search, isActive });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAgents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agents = await UserService.getAgents();
      res.status(200).json({
        success: true,
        data: { agents },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateUser(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAgentPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.id || (req.query.agentId as string) || undefined;
      // If agent is checking their own metrics
      const targetAgentId = req.user!.role === Role.AGENT ? req.user!.id : agentId;
      const performance = await UserService.getAgentPerformance(targetAgentId);
      res.status(200).json({
        success: true,
        data: { performance },
      });
    } catch (error) {
      next(error);
    }
  }
}
