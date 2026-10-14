import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { Role } from '@prisma/client';

let io: Server | null = null;

interface SocketUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: [env.CORS_ORIGIN, env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for socket connections
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (socket.handshake.headers?.cookie?.match(/access_token=([^;]+)/)?.[1]);

      if (!token) {
        return next(new Error('Authentication required for WebSocket connection'));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
      next();
    } catch (err: any) {
      logger.warn({ err: err.message }, 'WebSocket authentication failed');
      next(new Error('Invalid or expired WebSocket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: SocketUser = socket.data.user;
    logger.debug({ userId: user.userId, role: user.role }, 'WebSocket client connected');

    // Join personal user room
    socket.join(`user:${user.userId}`);

    // Join role room
    if (user.role === Role.ADMIN) {
      socket.join('role:admin');
    }
    if (user.role === Role.AGENT || user.role === Role.ADMIN) {
      socket.join('role:support');
    }

    // Join ticket rooms
    socket.on('ticket:subscribe', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('ticket:unsubscribe', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: user.userId }, 'WebSocket client disconnected');
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToAgents = (event: string, data: any) => {
  if (io) {
    io.to('role:support').emit(event, data);
  }
};

export const emitToAdmins = (event: string, data: any) => {
  if (io) {
    io.to('role:admin').emit(event, data);
  }
};

export const emitToTicket = (ticketId: string, event: string, data: any, internalOnly = false) => {
  if (!io) return;

  if (internalOnly) {
    // Internal notes must only be emitted to support agents / admins
    io.to('role:support').emit(event, { ticketId, ...data });
  } else {
    io.to(`ticket:${ticketId}`).emit(event, data);
    // Also notify general support channel
    io.to('role:support').emit(event, data);
  }
};
