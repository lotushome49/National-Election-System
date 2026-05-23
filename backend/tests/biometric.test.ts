import test from "node:test";
import assert from "node:assert/strict";
import { ConflictError, UnauthorizedError } from "../src/errors/AppError";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/nehs_test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "a".repeat(32);
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "b".repeat(32);
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "c".repeat(64);
process.env.CSRF_SECRET = process.env.CSRF_SECRET ?? "d".repeat(32);

const {
  computeFaceEmbeddingScore,
  createDemoFaceEmbedding,
  serializeFaceEmbedding,
} = await import("../src/utils/faceRecognition");
const { encrypt } = await import("../src/utils/crypto");
const { voterService } = await import("../src/modules/voter/voter.service");
const { voterRepository } =
  await import("../src/modules/voter/voter.repository");
const { authService } = await import("../src/modules/auth/auth.service");
const { authRepository } = await import("../src/modules/auth/auth.repository");
const { auditService } = await import("../src/modules/audit/audit.service");
const { prisma } = await import("../src/configs/database");

function stubMethod<T extends object, K extends keyof T>(
  target: T,
  key: K,
  replacement: T[K],
) {
  const original = target[key];
  target[key] = replacement;
  return () => {
    target[key] = original;
  };
}

test("computeFaceEmbeddingScore calculates accurate similarity scores", () => {
  const sampleA = serializeFaceEmbedding([0.1, 0.2, 0.3, 0.4]);
  const sampleB = serializeFaceEmbedding([0.1, 0.2, 0.3, 0.4]); // exact match
  const sampleC = serializeFaceEmbedding([0.1, 0.2, 0.3, 0.42]); // close match
  const sampleD = serializeFaceEmbedding([0.9, 0.8, 0.7, 0.6]); // different match

  assert.equal(computeFaceEmbeddingScore(sampleA, sampleB), 100);
  assert.ok(computeFaceEmbeddingScore(sampleA, sampleC) >= 85);
  assert.ok(computeFaceEmbeddingScore(sampleA, sampleD) < 50);
});

test("voter registration rejects duplicate biometric signatures (1:N fuzzy check)", async (t) => {
  const existingVoter = {
    id: "voter-existing-1",
    fullName: "Abebe Bikila",
    faceEmbedding: encrypt(serializeFaceEmbedding([0.1, 0.2, 0.3, 0.4])),
  };

  const prismaFindManyStub = async (args?: any) => [existingVoter] as any;
  const restore = [
    stubMethod(prisma.voter, "findMany", prismaFindManyStub),
    stubMethod(voterRepository, "findByNationalId", async () => null),
    stubMethod(voterRepository, "findByBiometricHash", async () => null),
    stubMethod(voterRepository, "create", async (data: any) => ({
      id: "v-new",
      voterId: "ET-12345",
      ...data,
    })),
    stubMethod(auditService, "log", async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  // Attempt to register duplicate (close match score >= 85%)
  await assert.rejects(
    voterService.register(
      {
        fullName: "New Voter",
        nationalId: "NID-999999",
        dateOfBirth: "1995-01-01",
        gender: "MALE",
        faceEmbedding: serializeFaceEmbedding([0.1, 0.2, 0.3, 0.41]), // slightly different probe
      },
      "actor-1",
      "127.0.0.1",
    ),
    (err: Error) => {
      assert.ok(err instanceof ConflictError);
      assert.ok(err.message.includes("Face duplicate detected"));
      return true;
    },
  );

  // Attempt to register unique (far match score < 85%)
  const successResult = await voterService.register(
    {
      fullName: "New Voter",
      nationalId: "NID-999999",
      dateOfBirth: "1995-01-01",
      gender: "MALE",
      faceEmbedding: createDemoFaceEmbedding("unique-probe"), // unique probe
    },
    "actor-1",
    "127.0.0.1",
  );

  assert.ok(typeof successResult.id === "string");
});

test("biometricLogin performs successful 1:N fuzzy matches and returns match scores", async (t) => {
  const existingVoter = {
    id: "voter-1",
    voterId: "ET-voter-1",
    fullName: "Tirunesh Dibaba",
    faceEmbedding: encrypt(serializeFaceEmbedding([0.1, 0.2, 0.3, 0.4])),
    regionId: "r1",
    districtId: "d1",
    isVerified: true,
  };

  const prismaFindManyStub = async (args?: any) => [existingVoter] as any;
  const restore = [
    stubMethod(prisma.voter, "findMany", prismaFindManyStub),
    stubMethod(authRepository, "createSession", async (data: any) => ({
      id: "session-1",
      ...data,
    })),
    stubMethod(authRepository, "touchSession", async () => undefined),
    stubMethod(auditService, "log", async () => undefined),
  ];
  t.after(() => restore.forEach((fn) => fn()));

  // Close match probe (score >= 85%) should log in successfully
  const successResult = await authService.biometricLogin(
    {
      faceEmbedding: serializeFaceEmbedding([0.1, 0.2, 0.3, 0.41]), // close match
    },
    "127.0.0.1",
  );

  assert.equal(successResult.voter.id, "voter-1");
  assert.ok(successResult.matchScore >= 85);
  assert.ok(typeof successResult.accessToken === "string");

  // Completely different probe (score < 85%) should fail
  await assert.rejects(
    authService.biometricLogin(
      {
        faceEmbedding: createDemoFaceEmbedding("unique-login"), // unique
      },
      "127.0.0.1",
    ),
    (err: Error) => {
      assert.ok(err instanceof UnauthorizedError);
      assert.ok(err.message.includes("Face authentication failed"));
      return true;
    },
  );
});
