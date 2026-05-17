import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from './logger';
import type { JwtPayload } from '../types';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`Socket connected: ${socket.id} | user: ${user.sub}`);

    // Join role-based rooms
    socket.join(`role:${user.role}`);
    if (user.regionId) socket.join(`region:${user.regionId}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialised — call initSocket() first');
  return io;
}

// Convenience emitters used by services
export const socketEmit = {
  resultsUpdate: (data: unknown) => getIO().emit('results:update', data),
  electionState: (electionId: string, status: string) =>
    getIO().emit('election:state', { electionId, status }),
  notifyUser: (userId: string, data: unknown) =>
    getIO().to(`user:${userId}`).emit('notification:new', data),
  notifyRole: (role: string, event: string, data: unknown) =>
    getIO().to(`role:${role}`).emit(event, data),
};
