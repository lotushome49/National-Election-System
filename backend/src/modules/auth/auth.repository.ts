import { prisma } from "../../configs/database";

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
      data: { lockUntil: until, status: "LOCKED" },
    }),

  /** Reset failed attempts and unlock on successful login */
  resetFailedAttempts: (id: string, ip: string) =>
    prisma.user.update({
      where: { id },
      data: {
        failedAttempts: 0,
        lockUntil: null,
        status: "ACTIVE",
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    }),

  /** Persist MFA state for a user */
  updateMfaState: (id: string, mfaEnabled: boolean, mfaSecret: string | null) =>
    prisma.user.update({
      where: { id },
      data: { mfaEnabled, mfaSecret },
      include: { role: { include: { permissions: true } } },
    }),

  /** Create a session row for a successful login */
  createSession: (data: {
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    prisma.userSession.create({
      data: {
        userId: data.userId,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    }),

  /** List all sessions for a user */
  listSessions: (userId: string) =>
    prisma.userSession.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { refreshToken: true },
    }),

  /** Find a session by id */
  findSessionById: (sessionId: string) =>
    prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { refreshToken: true },
    }),

  /** Find an active session by id */
  findActiveSessionById: (sessionId: string) =>
    prisma.userSession.findFirst({
      where: {
        id: sessionId,
        status: "ACTIVE",
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { refreshToken: true },
    }),

  /** Update session activity timestamp */
  touchSession: (sessionId: string) =>
    prisma.userSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    }),

  /** Revoke a session */
  revokeSession: (sessionId: string, userId: string) =>
    prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),

  /** Revoke all sessions for a user */
  revokeAllSessions: (userId: string) =>
    prisma.userSession.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),

  /** Store hashed refresh token */
  saveRefreshToken: (sessionId: string, tokenHash: string, expiresAt: Date) =>
    prisma.refreshToken.upsert({
      where: { sessionId },
      create: { sessionId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt },
    }),

  /** Find stored refresh token by sessionId */
  findRefreshToken: (sessionId: string) =>
    prisma.refreshToken.findUnique({ where: { sessionId } }),

  /** Revoke refresh token (logout) */
  revokeRefreshToken: (sessionId: string) =>
    prisma.refreshToken.deleteMany({ where: { sessionId } }),

  /** Find voter by biometric hash */
  findVoterByBiometricHash: (hash: string) =>
    prisma.voter.findFirst({
      where: { biometricHash: hash, deletedAt: null },
    }),
};
