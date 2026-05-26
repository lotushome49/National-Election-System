import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../configs/database";
import { logger } from "../../configs/logger";
import type { AuditAction } from "../../types";

interface AuditLogInput {
  userId?: string;
  electionId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

export const auditService = {
  async log(input: AuditLogInput): Promise<void> {
    const data = {
      id: uuidv4(),
      userId: input.userId,
      electionId: input.electionId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      oldValues: input.oldValues ? (input.oldValues as any) : undefined,
      newValues: input.newValues ? (input.newValues as any) : undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      description: input.description,
    };

    try {
      await prisma.auditLog.create({ data });
    } catch (err) {
      if (
        input.userId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        try {
          await prisma.auditLog.create({
            data: {
              ...data,
              userId: undefined,
            },
          });
          return;
        } catch (retryErr) {
          logger.error("Failed to write audit log", { err: retryErr, input });
          return;
        }
      }

      // Audit failures must never crash the main request
      logger.error("Failed to write audit log", { err, input });
    }
  },

  async list(query: {
    page: number;
    limit: number;
    userId?: string;
    electionId?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {
      ...(query.userId && { userId: query.userId }),
      ...(query.electionId && { electionId: query.electionId }),
      ...(query.action && { action: query.action }),
      ...(query.entity && { entity: query.entity }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, username: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  },
};
