import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    // Verify user in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
