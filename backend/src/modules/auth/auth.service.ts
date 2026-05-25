import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { authRepository } from "./auth.repository";
import {
  signAccessToken,
  signRefreshToken,
  signMfaChallengeToken,
  verifyRefreshToken,
  verifyMfaChallengeToken,
} from "../../utils/jwt";
import { sha256, encrypt, decrypt } from "../../utils/crypto";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../errors/AppError";
import { auditService } from "../audit/audit.service";
import {
  buildOtpAuthUrl,
  buildQrCodeUrl,
  createMfaStateCipher,
  generateMfaSecret,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  parseMfaStateCipher,
  type StoredMfaState,
  verifyTotpCode,
} from "../../utils/mfa";
import type {
  LoginDto,
  BiometricLoginDto,
  VoterTokenLoginDto,
  RefreshTokenDto,
  MfaChallengeDto,
  MfaEnrollmentVerifyDto,
  MfaDisableDto,
} from "./auth.schema";
import { prisma } from "../../configs/database";
import { computeFaceEmbeddingScore } from "../../utils/faceRecognition";
import { voterRepository } from "../voter/voter.repository";
import { votingRepository } from "../voting/voting.repository";
import { generateSecureToken } from "../../utils/crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const MFA_ELIGIBLE_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "REGIONAL_ADMIN",
  "DISTRICT_ADMIN",
]);

function serializeUser(user: any) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role.code,
    regionId: user.assignedRegionId ?? null,
    districtId: user.assignedDistrictId ?? null,
    assignedRegion: user.assignedRegionId ?? null,
    assignedDistrict: user.assignedDistrictId ?? null,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

function serializeSession(session: any) {
  return {
    id: session.id,
    userId: session.userId,
    status: session.status,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function isMfaEligibleRole(roleCode: string): boolean {
  return MFA_ELIGIBLE_ROLES.has(roleCode);
}

function getStoredMfaState(user: any): StoredMfaState {
  if (!user.mfaEnabled || !user.mfaSecret) {
    throw new BadRequestError("MFA is not enabled for this account");
  }

  return parseMfaStateCipher(user.mfaSecret);
}

async function ensureVoterUserRecord(voter: any) {
  const existingUser = voter.userId
    ? await prisma.user.findFirst({
        where: { id: voter.userId, deletedAt: null },
        include: { role: { include: { permissions: true } } },
      })
    : null;

  if (existingUser) {
    if (voter.userId !== existingUser.id) {
      await prisma.voter.update({
        where: { id: voter.id },
        data: { userId: existingUser.id },
      });
    }

    return existingUser;
  }

  const voterRole = await prisma.role.findFirst({
    where: { code: "VOTER", deletedAt: null },
    include: { permissions: true },
  });

  if (!voterRole) {
    throw new NotFoundError("Voter role");
  }

  const passwordHash = await bcrypt.hash(generateSecureToken(32), 12);
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      roleId: voterRole.id,
      fullName: voter.fullName,
      username: voter.nationalId,
      email: voter.email ?? null,
      passwordHash,
      status: "ACTIVE",
      assignedRegionId: voter.regionId ?? null,
      assignedDistrictId: voter.districtId ?? null,
      createdBy: voter.createdBy ?? "PUBLIC",
    },
    include: { role: { include: { permissions: true } } },
  });

  await prisma.voter.update({
    where: { id: voter.id },
    data: { userId: user.id },
  });

  return user;
}

export const authService = {
  async login(dto: LoginDto, ip: string) {
    // Trim and normalize identifier to improve login matching
    const identifier =
      typeof dto.username === "string" ? dto.username.trim() : "";
    console.log("Login identifier:", identifier);
    const user = await authRepository.findByLoginIdentifier(identifier);
    console.log("User found:", user ? user.id : null);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.status === "SUSPENDED") {
      throw new ForbiddenError("Account suspended. Contact administrator.");
    }

    if (
      user.status === "LOCKED" &&
      user.lockUntil &&
      user.lockUntil > new Date()
    ) {
      const minutesLeft = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenError(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isMatch) {
      const attempts = (user.failedAttempts ?? 0) + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await authRepository.lockAccount(user.id, lockUntil);
        await auditService.log({
          userId: user.id,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          description: "Account locked after max failed attempts",
          ipAddress: ip,
        });
        throw new ForbiddenError(
          "Account locked after too many failed attempts.",
        );
      }

      await authRepository.incrementFailedAttempts(user.id);
      throw new UnauthorizedError("Invalid credentials");
    }

    await authRepository.resetFailedAttempts(user.id, ip);

    if (
      isMfaEligibleRole(user.role.code) &&
      user.mfaEnabled &&
      user.mfaSecret
    ) {
      const challengeToken = signMfaChallengeToken({
        sub: user.id,
        role: user.role.code,
        regionId: user.assignedRegionId ?? undefined,
        districtId: user.assignedDistrictId ?? undefined,
      });

      await auditService.log({
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        description: "Password verified; MFA challenge issued",
        ipAddress: ip,
      });

      return {
        requiresMfa: true,
        challengeToken,
        user: serializeUser(user),
      };
    }

    const session = await authRepository.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: ip,
    });

    const tokens = await this._issueTokens(user, session.id);

    await auditService.log({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: "Successful login",
      ipAddress: ip,
    });

    return {
      requiresMfa: false,
      ...tokens,
      user: serializeUser(user),
      sessionId: session.id,
    };
  },

  async biometricLogin(dto: BiometricLoginDto, ip: string) {
    const faceEmbedding = dto.faceEmbedding;

    const allVoters = await prisma.voter.findMany({
      where: { deletedAt: null },
    });

    let bestVoter: any = null;
    let highestScore = 0;

    for (const v of allVoters) {
      if (v.faceEmbedding) {
        try {
          const decrypted = decrypt(v.faceEmbedding);
          const score = computeFaceEmbeddingScore(faceEmbedding, decrypted);
          if (score > highestScore) {
            highestScore = score;
            bestVoter = v;
          }
        } catch (e) {
          // Ignore decryption failures
        }
      }
    }

    if (!bestVoter || highestScore < 85) {
      throw new UnauthorizedError(
        `Face authentication failed${highestScore > 0 ? ` (highest match: ${highestScore}%)` : ""}`,
      );
    }

    const voter = bestVoter;

    if (!voter.isVerified) {
      throw new UnauthorizedError(
        "Voter registration is awaiting verification approval.",
      );
    }

    const voterUser = await ensureVoterUserRecord(voter);

    const session = await authRepository.createSession({
      userId: voterUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: ip,
    });

    const accessToken = signAccessToken(
      {
        sub: voterUser.id,
        sid: session.id,
        role: voterUser.role.code,
        regionId: voter.regionId ?? undefined,
        districtId: voter.districtId ?? undefined,
      },
      session.id,
    );

    await auditService.log({
      userId: voterUser.id,
      action: "LOGIN",
      entity: "Voter",
      entityId: voter.id,
      description: `Voter face login (match score: ${highestScore}%)`,
      ipAddress: ip,
    });

    await authRepository.touchSession(session.id);

    return {
      accessToken,
      token: accessToken,
      sessionId: session.id,
      voter: { id: voter.id, voterId: voter.voterId },
      matchScore: highestScore,
    };
  },

  async voterTokenLogin(dto: VoterTokenLoginDto, ip: string) {
    const nationalId = dto.nationalId.trim();
    const votingToken = dto.votingToken.trim();

    const voter = await voterRepository.findByNationalId(nationalId);
    if (!voter) {
      throw new UnauthorizedError("Invalid national ID or voting token");
    }

    if (!(voter as any).isVerified) {
      throw new ForbiddenError(
        "Voter registration is awaiting verification approval.",
      );
    }

    const tokenHash = sha256(votingToken);
    const tokenRecord = await votingRepository.findTokenByHash(tokenHash);
    if (!tokenRecord || tokenRecord.voterId !== voter.id) {
      throw new UnauthorizedError("Invalid national ID or voting token");
    }

    if (tokenRecord.status !== "UNUSED") {
      throw new ForbiddenError("Voting token has already been used");
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new ForbiddenError("Voting token has expired");
    }

    const voterUser = await ensureVoterUserRecord(voter);

    const session = await authRepository.createSession({
      userId: voterUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: ip,
    });

    const accessToken = signAccessToken(
      {
        sub: voterUser.id,
        sid: session.id,
        role: voterUser.role.code,
        regionId: voter.regionId ?? undefined,
        districtId: voter.districtId ?? undefined,
      },
      session.id,
    );

    await authRepository.touchSession(session.id);

    await auditService.log({
      userId: voterUser.id,
      action: "LOGIN",
      entity: "Voter",
      entityId: voter.id,
      description: "Voter token login",
      ipAddress: ip,
    });

    return {
      accessToken,
      token: accessToken,
      sessionId: session.id,
      user: {
        id: voterUser.id,
        fullName: voter.fullName,
        username: voter.nationalId,
        role: voterUser.role.code,
        voterId: voter.voterId,
        uniqueVoterId: voter.voterId,
      },
      voter: { id: voter.id, voterId: voter.voterId },
    };
  },

  async createVoterSession(voterId: string, ip: string) {
    const voter = await voterRepository.findById(voterId);
    if (!voter) {
      throw new NotFoundError("Voter");
    }

    const voterUser = await ensureVoterUserRecord(voter);

    const session = await authRepository.createSession({
      userId: voterUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: ip,
    });

    const tokens = await this._issueTokens(voterUser, session.id);

    await authRepository.touchSession(session.id);

    return {
      ...tokens,
      sessionId: session.id,
      user: {
        id: voterUser.id,
        fullName: voter.fullName,
        username: voter.nationalId,
        role: voterUser.role.code,
        voterId: voter.voterId,
        uniqueVoterId: voter.voterId,
      },
      voter: { id: voter.id, voterId: voter.voterId },
    };
  },

  async refresh(dto: RefreshTokenDto) {
    let payload;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (!payload.sid) {
      throw new UnauthorizedError(
        "Refresh token is missing a session identifier",
      );
    }

    const session = await authRepository.findSessionById(payload.sid);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.status !== "ACTIVE" ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedError(
        "Refresh token not found - please login again",
      );
    }

    const stored = await authRepository.findRefreshToken(payload.sid);
    if (!stored) {
      throw new UnauthorizedError(
        "Refresh token not found - please login again",
      );
    }

    const submittedHash = sha256(dto.refreshToken);
    if (stored.tokenHash !== submittedHash) {
      await authRepository.revokeSession(payload.sid, payload.sub);
      await authRepository.revokeRefreshToken(payload.sid);
      throw new UnauthorizedError(
        "Refresh token reuse detected - please login again",
      );
    }

    if (stored.expiresAt < new Date()) {
      await authRepository.revokeSession(payload.sid, payload.sub);
      await authRepository.revokeRefreshToken(payload.sid);
      throw new UnauthorizedError("Refresh token expired");
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundError("User");
    }

    await authRepository.touchSession(payload.sid);

    return this._issueTokens(user, payload.sid);
  },

  async completeMfaChallenge(dto: MfaChallengeDto, ip: string) {
    let payload;
    try {
      payload = verifyMfaChallengeToken(dto.challengeToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired MFA challenge");
    }

    if (payload.type !== "mfa") {
      throw new UnauthorizedError("Invalid MFA challenge");
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundError("User");
    }

    const state = getStoredMfaState(user);
    const factorResult = this._consumeMfaFactor(state, dto);
    if (!factorResult.valid) {
      throw new UnauthorizedError("Invalid MFA code");
    }

    if (factorResult.nextState) {
      await authRepository.updateMfaState(
        user.id,
        true,
        createMfaStateCipher(factorResult.nextState),
      );
    }

    const session = await authRepository.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: ip,
    });

    const tokens = await this._issueTokens(user, session.id);

    await auditService.log({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: factorResult.usedRecoveryCode
        ? "Successful MFA login with recovery code"
        : "Successful MFA login",
      ipAddress: ip,
    });

    return {
      requiresMfa: false,
      ...tokens,
      user: serializeUser(user),
      sessionId: session.id,
      recoveryCodesRemaining:
        factorResult.nextState?.recoveryCodes.length ??
        state.recoveryCodes.length,
    };
  },

  async logout(userId: string, sessionId: string | undefined, ip: string) {
    if (sessionId) {
      await authRepository.revokeSession(sessionId, userId);
      await authRepository.revokeRefreshToken(sessionId);
    } else {
      await authRepository.revokeAllSessions(userId);
    }

    await auditService.log({
      userId,
      action: "LOGOUT",
      entity: "User",
      entityId: userId,
      description: "User logged out",
      ipAddress: ip,
    });
  },

  async listSessions(userId: string) {
    const sessions = await authRepository.listSessions(userId);
    return sessions.map(serializeSession);
  },

  async revokeSession(userId: string, sessionId: string, ip: string) {
    const session = await authRepository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundError("Session");
    }

    await authRepository.revokeSession(sessionId, userId);
    await authRepository.revokeRefreshToken(sessionId);

    await auditService.log({
      userId,
      action: "LOGOUT",
      entity: "UserSession",
      entityId: sessionId,
      description: "User revoked an active session",
      ipAddress: ip,
    });

    return serializeSession({
      ...session,
      status: "REVOKED",
      revokedAt: new Date(),
    });
  },

  async getMfaStatus(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const eligible = isMfaEligibleRole(user.role.code);
    const recoveryCodesRemaining =
      user.mfaEnabled && user.mfaSecret
        ? parseMfaStateCipher(user.mfaSecret).recoveryCodes.length
        : 0;

    return {
      eligible,
      enabled: Boolean(user.mfaEnabled),
      recoveryCodesRemaining,
    };
  },

  async beginMfaEnrollment(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    if (!isMfaEligibleRole(user.role.code)) {
      throw new ForbiddenError(
        "MFA enrollment is only available for admin-level accounts",
      );
    }

    if (user.mfaEnabled) {
      throw new BadRequestError("MFA is already enabled for this account");
    }

    const secret = generateMfaSecret();
    const recoveryCodes = generateRecoveryCodes();
    const otpauthUrl = buildOtpAuthUrl(secret, user.username);

    return {
      secret,
      otpauthUrl,
      qrCodeUrl: buildQrCodeUrl(otpauthUrl),
      setupToken: encrypt(JSON.stringify({ userId, secret, recoveryCodes })),
    };
  },

  async verifyMfaEnrollment(
    userId: string,
    dto: MfaEnrollmentVerifyDto,
    ip: string,
  ) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const enrollmentState = JSON.parse(decrypt(dto.setupToken)) as {
      userId: string;
      secret: string;
      recoveryCodes: string[];
    };

    if (enrollmentState.userId !== userId) {
      throw new ForbiddenError(
        "Enrollment token does not belong to the current user",
      );
    }

    if (!verifyTotpCode(enrollmentState.secret, dto.code)) {
      throw new UnauthorizedError("Invalid MFA code");
    }

    await authRepository.updateMfaState(
      userId,
      true,
      createMfaStateCipher({
        secret: enrollmentState.secret,
        recoveryCodes: enrollmentState.recoveryCodes,
      }),
    );

    await auditService.log({
      userId,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      description: "MFA enabled for user",
      ipAddress: ip,
    });

    return {
      enabled: true,
      recoveryCodes: enrollmentState.recoveryCodes,
    };
  },

  async disableMfa(userId: string, dto: MfaDisableDto, ip: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const state = getStoredMfaState(user);
    const factorResult = this._consumeMfaFactor(state, dto);
    if (!factorResult.valid) {
      throw new UnauthorizedError("Invalid MFA code");
    }

    await authRepository.updateMfaState(userId, false, null);

    await auditService.log({
      userId,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      description: "MFA disabled for user",
      ipAddress: ip,
    });

    return { enabled: false };
  },

  async _issueTokens(user: any, sessionId: string) {
    const tokenPayload = {
      sub: user.id,
      sid: sessionId,
      role: user.role.code,
      regionId: user.assignedRegionId ?? undefined,
      districtId: user.assignedDistrictId ?? undefined,
    };

    const accessToken = signAccessToken(tokenPayload, sessionId);
    const refreshToken = signRefreshToken(tokenPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(
      sessionId,
      sha256(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken, token: accessToken };
  },

  _consumeMfaFactor(
    state: StoredMfaState,
    dto: { code?: string; recoveryCode?: string },
  ) {
    if (dto.code && verifyTotpCode(state.secret, dto.code)) {
      return { valid: true, usedRecoveryCode: false };
    }

    if (dto.recoveryCode) {
      const normalizedInput = normalizeRecoveryCode(dto.recoveryCode);
      const matchedCode = state.recoveryCodes.find(
        (code) => normalizeRecoveryCode(code) === normalizedInput,
      );
      if (!matchedCode) {
        return { valid: false, usedRecoveryCode: false };
      }

      return {
        valid: true,
        usedRecoveryCode: true,
        nextState: {
          secret: state.secret,
          recoveryCodes: state.recoveryCodes.filter(
            (code) => code !== matchedCode,
          ),
        },
      };
    }

    return { valid: false, usedRecoveryCode: false };
  },
};
