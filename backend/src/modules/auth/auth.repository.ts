import { prisma } from '../../config/database';

export const authRepository = {
  /** Find user by username, including role for permission checks */
  findByUsername: (username: string) =>
    prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: { role: { include: { permissions: true } } },
    }),

  /** Find user by id */
  findById: (id: string) =>
    prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: { include: { permissions: true } } },
    }),

  /** Increment failed login attempts */
  incrementFailedAttempts: (id: string) =>
    prisma.user.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
    }),

  /** Lock account until a given time */
  lockAccount: (id: string, until: Date) =>
    prisma.user.update({
      where: { id },
      data: { lockUntil: until, status: 'LOCKED' },
    }),

  /** Reset failed attempts and unlock on successful login */
  resetFailedAttempts: (id: string, ip: string) =>
    prisma.user.update({
      where: { id },
      data: {
        failedAttempts: 0,
        lockUntil:      null,
        status:         'ACTIVE',
        lastLoginAt:    new Date(),
        lastLoginIp:    ip,
      },
    }),

  /** Store hashed refresh token */
  saveRefreshToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.refreshToken.upsert({
      where:  { userId },
      create: { userId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt },
    }),

  /** Find stored refresh token by userId */
  findRefreshToken: (userId: string) =>
    prisma.refreshToken.findUnique({ where: { userId } }),

  /** Revoke refresh token (logout) */
  revokeRefreshToken: (userId: string) =>
    prisma.refreshToken.deleteMany({ where: { userId } }),

  /** Find voter by biometric hash */
  findVoterByBiometricHash: (hash: string) =>
    prisma.voter.findFirst({
      where: { biometricHash: hash, deletedAt: null },
    }),
};
