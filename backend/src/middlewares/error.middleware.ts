import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      path: req.path,
      method: req.method,
    },
    'Request error'
  );

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Handle Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        message: `Unique constraint violated. A record with this ${target} already exists.`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record could not be found.',
      });
      return;
    }
  }

  // Default fallback internal server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { error: err.message, stack: err.stack }),
  });
};
