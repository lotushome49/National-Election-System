import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/nehs_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'b'.repeat(32);
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'c'.repeat(64);
process.env.CSRF_SECRET = process.env.CSRF_SECRET ?? 'd'.repeat(32);

const { authService } = await import('../src/modules/auth/auth.service');
const { authRepository } = await import('../src/modules/auth/auth.repository');
const { auditService } = await import('../src/modules/audit/audit.service');
const {
  createMfaStateCipher,
  generateMfaSecret,
  generateRecoveryCodes,
  generateTotpCode,
  parseMfaStateCipher,
  verifyTotpCode,
} = await import('../src/utils/mfa');
const { encrypt } = await import('../src/utils/crypto');
const { signMfaChallengeToken } = await import('../src/utils/jwt');

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    fullName: 'Admin User',
    username: 'admin.user',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('StrongPass!123', 10),
    status: 'ACTIVE',
    failedAttempts: 0,
    lockUntil: null,
    assignedRegionId: null,
    assignedDistrictId: null,
    mfaEnabled: false,
    mfaSecret: null,
    role: { code: 'ADMIN', permissions: [] },
    ...overrides,
  };
}

function stubMethod<T extends object, K extends keyof T>(target: T, key: K, replacement: T[K]) {
  const original = target[key];
  target[key] = replacement;
  return () => {
    target[key] = original;
  };
}

test('verifyTotpCode accepts a generated current code', () => {
  const secret = generateMfaSecret();
  const code = generateTotpCode(secret);

  assert.equal(verifyTotpCode(secret, code), true);
  assert.equal(verifyTotpCode(secret, '000000'), false);
});

test('login returns MFA challenge for enabled admin accounts', async (t) => {
  const user = createUser({
    mfaEnabled: true,
    mfaSecret: createMfaStateCipher({ secret: generateMfaSecret(), recoveryCodes: generateRecoveryCodes(2) }),
  });

  const restore = [
    stubMethod(authRepository, 'findByUsername', async () => user as any),
    stubMethod(authRepository, 'resetFailedAttempts', async () => user as any),
    stubMethod(authRepository, 'incrementFailedAttempts', async () => user as any),
    stubMethod(authRepository, 'lockAccount', async () => user as any),
    stubMethod(auditService, 'log', async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  const result = await authService.login({ username: 'admin.user', password: 'StrongPass!123' }, '127.0.0.1');

  assert.equal(result.requiresMfa, true);
  assert.equal(typeof result.challengeToken, 'string');
  assert.equal(result.user.mfaEnabled, true);
});

test('verifyMfaEnrollment enables MFA and returns recovery codes', async (t) => {
  const user = createUser();
  const secret = generateMfaSecret();
  const recoveryCodes = generateRecoveryCodes(5);
  const code = generateTotpCode(secret);
  const updates: Array<{ enabled: boolean; cipher: string | null }> = [];

  const restore = [
    stubMethod(authRepository, 'findById', async () => user as any),
    stubMethod(authRepository, 'updateMfaState', async (_id: string, enabled: boolean, cipher: string | null) => {
      updates.push({ enabled, cipher });
      return { ...user, mfaEnabled: enabled, mfaSecret: cipher } as any;
    }),
    stubMethod(auditService, 'log', async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  const result = await authService.verifyMfaEnrollment(
    'user-1',
    {
      setupToken: encrypt(JSON.stringify({ userId: 'user-1', secret, recoveryCodes })),
      code,
    },
    '127.0.0.1',
  );

  assert.equal(result.enabled, true);
  assert.deepEqual(result.recoveryCodes, recoveryCodes);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].enabled, true);
  assert.deepEqual(parseMfaStateCipher(updates[0].cipher as string).recoveryCodes, recoveryCodes);
});

test('completeMfaChallenge consumes a recovery code and issues tokens', async (t) => {
  const secret = generateMfaSecret();
  const user = createUser({
    mfaEnabled: true,
    mfaSecret: createMfaStateCipher({ secret, recoveryCodes: ['ABCD-EFGH'] }),
  });
  const updates: Array<{ enabled: boolean; cipher: string | null }> = [];

  const restore = [
    stubMethod(authRepository, 'findById', async () => user as any),
    stubMethod(authRepository, 'updateMfaState', async (_id: string, enabled: boolean, cipher: string | null) => {
      updates.push({ enabled, cipher });
      return { ...user, mfaEnabled: enabled, mfaSecret: cipher } as any;
    }),
    stubMethod(authRepository, 'saveRefreshToken', async () => undefined),
    stubMethod(authRepository, 'createSession', async () => ({ id: 'session-1' } as any)),
    stubMethod(auditService, 'log', async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  const result = await authService.completeMfaChallenge(
    {
      challengeToken: signMfaChallengeToken({ sub: 'user-1', role: 'ADMIN' }),
      recoveryCode: 'ABCD-EFGH',
    },
    '127.0.0.1',
  );

  assert.equal(result.requiresMfa, false);
  assert.equal(typeof result.token, 'string');
  assert.equal(result.recoveryCodesRemaining, 0);
  assert.equal(updates.length, 1);
});

test('disableMfa clears MFA state when password and code are valid', async (t) => {
  const secret = generateMfaSecret();
  const user = createUser({
    mfaEnabled: true,
    mfaSecret: createMfaStateCipher({ secret, recoveryCodes: generateRecoveryCodes(2) }),
  });
  const code = generateTotpCode(secret);
  const updates: Array<{ enabled: boolean; cipher: string | null }> = [];

  const restore = [
    stubMethod(authRepository, 'findById', async () => user as any),
    stubMethod(authRepository, 'updateMfaState', async (_id: string, enabled: boolean, cipher: string | null) => {
      updates.push({ enabled, cipher });
      return { ...user, mfaEnabled: enabled, mfaSecret: cipher } as any;
    }),
    stubMethod(auditService, 'log', async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  const result = await authService.disableMfa(
    'user-1',
    {
      password: 'StrongPass!123',
      code,
    },
    '127.0.0.1',
  );

  assert.deepEqual(result, { enabled: false });
  assert.deepEqual(updates, [{ enabled: false, cipher: null }]);
});
