import { Server as HttpServer } from 'http';
import { Server, Socket, BroadcastOperator } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from './logger';
import { prisma } from './database';
import type { JwtPayload } from '../types';

let io: Server;

type SocketScope = {
  userId?: string;
  role?: string;
  electionId?: string;
  regionId?: string;
  districtId?: string;
  pollingStationId?: string;
};

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
  io.use(async (socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      if (payload.type !== 'access') {
        return next(new Error('Access token required'));
      }

      if (payload.sid) {
        const session = await prisma.userSession.findFirst({
          where: {
            id: payload.sid,
            userId: payload.sub,
            status: 'ACTIVE',
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });

        if (!session) {
          return next(new Error('Session is no longer active'));
        }
      }

      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`Socket connected: ${socket.id} | user: ${user.sub}`);

    socket.join(`user:${user.sub}`);
    socket.join(`role:${user.role}`);
    if (user.regionId) socket.join(`region:${user.regionId}`);
    if (user.districtId) socket.join(`district:${user.districtId}`);

    socket.on('join:election', (electionId: unknown) => {
      if (typeof electionId !== 'string' || !electionId.trim()) return;
      socket.join(`election:${electionId}`);
    });

    socket.on('leave:election', (electionId: unknown) => {
      if (typeof electionId !== 'string' || !electionId.trim()) return;
      socket.leave(`election:${electionId}`);
    });

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

function emitScoped(event: string, data: unknown, scope?: SocketScope): void {
  if (!scope) {
    getIO().emit(event, data);
    return;
  }

  let target: BroadcastOperator<any, any> | null = null;
  let hasTarget = false;

  if (scope.role) {
    target = getIO().to(`role:${scope.role}`);
    hasTarget = true;
  }

  if (scope.userId) {
    target = hasTarget && target ? target.to(`user:${scope.userId}`) : getIO().to(`user:${scope.userId}`);
    hasTarget = true;
  }

  if (scope.electionId) {
    target = hasTarget && target
      ? target.to(`election:${scope.electionId}`)
      : getIO().to(`election:${scope.electionId}`);
    hasTarget = true;
  }

  if (scope.regionId) {
    target = hasTarget && target
      ? target.to(`region:${scope.regionId}`)
      : getIO().to(`region:${scope.regionId}`);
    hasTarget = true;
  }

  if (scope.districtId) {
    target = hasTarget && target
      ? target.to(`district:${scope.districtId}`)
      : getIO().to(`district:${scope.districtId}`);
    hasTarget = true;
  }

  if (scope.pollingStationId) {
    target = hasTarget && target
      ? target.to(`polling-station:${scope.pollingStationId}`)
      : getIO().to(`polling-station:${scope.pollingStationId}`);
    hasTarget = true;
  }

  if (!hasTarget) {
    getIO().emit(event, data);
    return;
  }

  target!.emit(event, data);
}

// Convenience emitters used by services
export const socketEmit = {
  resultsUpdate: (data: {
    electionId?: string;
    regionId?: string;
    districtId?: string;
    pollingStationId?: string;
    [key: string]: unknown;
  }) =>
    emitScoped('results:update', data, {
      electionId: data.electionId,
      regionId: data.regionId,
      districtId: data.districtId,
      pollingStationId: data.pollingStationId,
    }),
  electionState: (electionId: string, status: string) =>
    emitScoped('election:state', { electionId, status }, { electionId }),
  notifyUser: (userId: string, data: unknown) =>
    emitScoped('notification:new', data, { userId }),
  notifyRole: (role: string, event: string, data: unknown) =>
    emitScoped(event, data, { role }),
};
