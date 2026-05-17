import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { socketEmit } from '../../config/socket';
import { logger } from '../../config/logger';
import { buildPaginationMeta } from '../../utils/response';
import { NotFoundError } from '../../errors/AppError';
import type { SendNotificationDto, BroadcastDto, NotificationQuery } from './notification.schema';

export const notificationService = {
  // ── List notifications for the calling user ─────────────────────────────────
  async listForUser(userId: string, q: NotificationQuery) {
    const where: any = {
      userId,
      ...(q.status && { status: q.status }),
      ...(q.type   && { type:   q.type }),
    };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  // ── Mark a notification as read ─────────────────────────────────────────────
  async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundError('Notification');

    return prisma.notification.update({
      where: { id },
      data:  { status: 'READ', readAt: new Date() },
    });
  },

  // ── Send a single notification ───────────────────────────────────────────────
  async send(dto: SendNotificationDto): Promise<void> {
    const notification = await prisma.notification.create({
      data: {
        id:       uuidv4(),
        userId:   dto.userId,
        type:     dto.type,
        subject:  dto.subject,
        body:     dto.body,
        metadata: dto.metadata as any,
        status:   'PENDING',
      },
    });

    // Deliver via Socket.IO for IN_APP; other channels would call external services
    if (dto.type === 'IN_APP') {
      socketEmit.notifyUser(dto.userId, {
        id:      notification.id,
        subject: dto.subject,
        body:    dto.body,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data:  { status: 'SENT', sentAt: new Date() },
      });
    } else {
      // Placeholder: integrate email/SMS provider here (SendGrid, Twilio, etc.)
      logger.info(`[Notification] ${dto.type} queued for user ${dto.userId}: ${dto.subject}`);
      await prisma.notification.update({
        where: { id: notification.id },
        data:  { status: 'SENT', sentAt: new Date() },
      });
    }
  },

  // ── Broadcast to all users with a given role ─────────────────────────────────
  async broadcast(dto: BroadcastDto): Promise<{ queued: number }> {
    const where: any = { deletedAt: null };
    if (dto.roleCode) {
      where.role = { code: dto.roleCode };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    await Promise.all(
      users.map((u) =>
        notificationService.send({ ...dto, userId: u.id }),
      ),
    );

    return { queued: users.length };
  },
};
