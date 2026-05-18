import bcrypt from "bcryptjs";
import { logger } from "../../configs/logger";
import { env } from "../../configs/env";
import { prisma } from "../../configs/database";
import { auditService } from "../audit/audit.service";
import { authRepository } from "../auth/auth.repository";
import { passwordResetRepository } from "./passwordReset.repository";
import { NotFoundError, UnauthorizedError } from "../../errors/AppError";
import { generateSecureToken, sha256 } from "../../utils/crypto";
import type {
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
} from "./passwordReset.schema";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const DEV_MAILBOX_LIMIT = 20;

type DevResetMessage = {
  id: string;
  email: string;
  subject: string;
  body: string;
  resetUrl: string;
  createdAt: Date;
};

const devMailbox: DevResetMessage[] = [];

function getAppOrigin(originHeader?: string | string[]): string {
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  return origin || env.CORS_ORIGIN || "http://localhost:5173";
}

function buildResetUrl(origin: string, userId: string, token: string) {
  const url = new URL("/", origin);
  url.searchParams.set("view", "password-reset");
  url.searchParams.set("userId", userId);
  url.searchParams.set("token", token);
  return url.toString();
}

function enqueueDevMailbox(message: DevResetMessage) {
  devMailbox.unshift(message);
  if (devMailbox.length > DEV_MAILBOX_LIMIT) {
    devMailbox.length = DEV_MAILBOX_LIMIT;
  }
}

export const passwordResetService = {
  async requestReset(
    dto: PasswordResetRequestDto,
    meta: { ip: string; userAgent?: string; origin?: string },
  ) {
    const user = await passwordResetRepository.findUserByEmail(dto.email);

    if (!user) {
      logger.info(
        `[PasswordReset] reset requested for unknown email: ${dto.email}`,
      );
      return { message: "If the account exists, a reset link has been sent." };
    }

    const rawToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await passwordResetRepository.upsertToken({
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt,
      requestedIp: meta.ip,
      requestedUserAgent: meta.userAgent,
    });

    const resetUrl = buildResetUrl(
      getAppOrigin(meta.origin),
      user.id,
      rawToken,
    );
    const message = {
      id: generateSecureToken(8),
      email: user.email ?? dto.email,
      subject: "NEHS password reset link",
      body: `A password reset was requested for ${user.username}. Open the reset link to continue.`,
      resetUrl,
      createdAt: new Date(),
    };

    enqueueDevMailbox(message);
    logger.info(
      `[PasswordReset] reset link queued for ${message.email}: ${resetUrl}`,
    );

    return {
      message: "If the account exists, a reset link has been sent.",
      debug:
        env.NODE_ENV === "production"
          ? undefined
          : { userId: user.id, token: rawToken, resetUrl },
    };
  },

  async confirmReset(dto: PasswordResetConfirmDto, ip: string) {
    const user = await authRepository.findById(dto.userId);
    if (!user || !user.email) {
      throw new NotFoundError("User");
    }

    const tokenRecord = await passwordResetRepository.findTokenByUserId(
      dto.userId,
    );
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.usedAt) {
      throw new UnauthorizedError("Reset token is invalid or expired");
    }

    if (tokenRecord.expiresAt < new Date()) {
      await passwordResetRepository.revokeToken(dto.userId);
      throw new UnauthorizedError("Reset token is invalid or expired");
    }

    if (tokenRecord.tokenHash !== sha256(dto.token)) {
      throw new UnauthorizedError("Reset token is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await prisma.user.update({
      where: { id: dto.userId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockUntil: null,
        status: "ACTIVE",
        updatedBy: dto.userId,
      },
    });

    await authRepository.revokeAllSessions(dto.userId);
    await prisma.refreshToken.deleteMany({
      where: { session: { userId: dto.userId } },
    });
    await passwordResetRepository.markTokenUsed(dto.userId);

    await auditService.log({
      userId: dto.userId,
      action: "UPDATE",
      entity: "User",
      entityId: dto.userId,
      description: "Password reset completed",
      ipAddress: ip,
    });

    return { message: "Password updated successfully" };
  },

  listDevMailbox() {
    return devMailbox;
  },
};
