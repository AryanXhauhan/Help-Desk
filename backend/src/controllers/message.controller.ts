import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class MessageController {
  static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await MessageService.getMessages(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await MessageService.createMessage(req.params.id, req.user!, req.body);
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }
}
