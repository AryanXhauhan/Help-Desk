import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class DashboardController {
  static async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await DashboardService.getMetrics(req.user!);
      res.status(200).json({
        success: true,
        data: { metrics },
      });
    } catch (error) {
      next(error);
    }
  }
}
