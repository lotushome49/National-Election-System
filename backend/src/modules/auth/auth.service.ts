import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sha256, generateSecureToken } from '../../utils/crypto';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/AppError';
import { auditService } from '../audit/audit.service';
import type { LoginDto, BiometricLoginDto, RefreshTokenDto } from './auth.schema';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 30 * 60 * 1000; // 30 minutes

export const authService = {
  // ─── Staff / Admin login ────────────────────────────────────────────────────
  async login(dto: LoginDto, ip: string) {
    const user = await authRepository.findByUsername(dto.username);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Account status checks
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account suspended. Contact administrator.');
    }

    if (user.status === 'LOCKED' && user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenError(`Account locked. Try again in ${minutesLeft} minute(s).`);
    }

    // Verify password
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isMatch) {
      const attempts = (user.failedAttempts ?? 0) + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await authRepository.lockAccount(user.id, lockUntil);
        await auditService.log({
          userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id,
          description: 'Account locked after max failed attempts', ipAddress: ip,
        });
        throw new ForbiddenError('Account locked after too many failed attempts.');
      }

      await authRepository.incrementFailedAttempts(user.id);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Success — reset counters
    await authRepository.resetFailedAttempts(user.id, ip);

    const tokens = await this._issueTokens(user, ip);

    await auditService.log({
      userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id,
      description: 'Successful login', ipAddress: ip,
    });

    return {
      ...tokens,
      user: {
        id:       user.id,
        fullName: user.fullName,
        username: user.username,
        email:    user.email,
        role:     user.role.code,
      },
    };
  },

  // ─── Voter biometric login ──────────────────────────────────────────────────
  async biometricLogin(dto: BiometricLoginDto, ip: string) {
    const hash  = sha256(dto.biometricHash);
    const voter = await authRepository.findVoterByBiometricHash(hash);

    if (!voter) {
      throw new UnauthorizedError('Biometric authentication failed');
    }

    const accessToken = signAccessToken({
      sub:      voter.id,
      role:     'VOTER',
      regionId: voter.regionId ?? undefined,
      districtId: voter.districtId ?? undefined,
    });

    await auditService.log({
      userId: voter.id, action: 'LOGIN', entity: 'Voter', entityId: voter.id,
      description: 'Voter biometric login', ipAddress: ip,
    });

    return { accessToken, voter: { id: voter.id, voterId: voter.voterId } };
  },

  // ─── Refresh access token ───────────────────────────────────────────────────
  async refresh(dto: RefreshTokenDto, ip: string) {
    let payload;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const stored = await authRepository.findRefreshToken(payload.sub);
    if (!stored) throw new UnauthorizedError('Refresh token not found — please login again');

    // Validate stored hash matches submitted token
    const submittedHash = sha256(dto.refreshToken);
    if (stored.tokenHash !== submittedHash) {
      // Possible token reuse — revoke all
      await authRepository.revokeRefreshToken(payload.sub);
      throw new UnauthorizedError('Refresh token reuse detected — please login again');
    }

    if (stored.expiresAt < new Date()) {
      await authRepository.revokeRefreshToken(payload.sub);
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) throw new NotFoundError('User');

    return this._issueTokens(user, ip);
  },

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string, ip: string) {
    await authRepository.revokeRefreshToken(userId);
    await auditService.log({
      userId, action: 'LOGOUT', entity: 'User', entityId: userId,
      description: 'User logged out', ipAddress: ip,
    });
  },

  // ─── Internal: issue access + refresh tokens ─────────────────────────────
  async _issueTokens(user: any, ip: string) {
    const tokenPayload = {
      sub:        user.id,
      role:       user.role.code,
      regionId:   user.assignedRegionId   ?? undefined,
      districtId: user.assignedDistrictId ?? undefined,
    };

    const accessToken  = signAccessToken(tokenPayload);
    const rawRefresh   = generateSecureToken(48);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store hash of the raw refresh token (never store plaintext)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await authRepository.saveRefreshToken(user.id, sha256(refreshToken), expiresAt);

    return { accessToken, refreshToken };
  },
};
