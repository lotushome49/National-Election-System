import { prisma } from "../../configs/database";

export const passwordResetRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: { include: { permissions: true } } },
    }),

  findTokenByUserId: (userId: string) =>
    prisma.passwordResetToken.findUnique({ where: { userId } }),

  upsertToken: (data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestedIp?: string;
    requestedUserAgent?: string;
  }) =>
    prisma.passwordResetToken.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        requestedIp: data.requestedIp,
        requestedUserAgent: data.requestedUserAgent,
      },
      update: {
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
        revokedAt: null,
        requestedIp: data.requestedIp,
        requestedUserAgent: data.requestedUserAgent,
      },
    }),

  markTokenUsed: (userId: string) =>
    prisma.passwordResetToken.update({
      where: { userId },
      data: { usedAt: new Date() },
    }),

  revokeToken: (userId: string) =>
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};
