import { Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class TicketController {
  static async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await TicketService.createTicket(req.user!, req.body);
      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketService.getTickets(req.user!, req.query as any);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await TicketService.getTicketById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await TicketService.updateStatus(
        req.params.id,
        req.user!,
        req.body.status,
        req.body.reason
      );
      res.status(200).json({
        success: true,
        message: 'Ticket status updated',
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePriority(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await TicketService.updatePriority(
        req.params.id,
        req.user!,
        req.body.priority
      );
      res.status(200).json({
        success: true,
        message: 'Ticket priority updated',
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await TicketService.assignTicket(
        req.params.id,
        req.user!,
        req.body.agentId
      );
      res.status(200).json({
        success: true,
        message: 'Ticket assigned successfully',
        data: { ticket },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTicketActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await TicketService.getTicketActivity(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: { activities },
      });
    } catch (error) {
      next(error);
    }
  }
}
