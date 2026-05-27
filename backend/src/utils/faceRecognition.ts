import crypto from "crypto";

export function normalizeFaceEmbedding(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function serializeFaceEmbedding(
  embedding: number[] | Float32Array,
): string {
  return JSON.stringify(
    Array.from(embedding).map((value) => Number(value.toFixed(6))),
  );
}

export function parseFaceEmbedding(value: string): number[] {
  const normalized = normalizeFaceEmbedding(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry));
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return normalized
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
}

export function computeFaceEmbeddingScore(
  probe: string,
  reference: string,
): number {
  const p = parseFaceEmbedding(probe);
  const r = parseFaceEmbedding(reference);

  if (!p.length || !r.length) return 0;

  const length = Math.min(p.length, r.length);
  let distance = 0;
  for (let i = 0; i < length; i += 1) {
    const diff = p[i] - r[i];
    distance += diff * diff;
  }
  distance = Math.sqrt(distance);

  // face-api.js euclidean distance:
  // < 0.4: high confidence same person
  // 0.4 - 0.5: good confidence same person
  // > 0.6: different person
  // Map to a 0-100 score where distance 0.45 = 85% (the strict threshold)
  // 15 / 0.45 = 33.33 multiplier
  const score = Math.max(0, 100 - (distance * 33.33));
  return Math.round(score);
}

export function createDemoFaceEmbedding(seed: string): string {
  const normalizedSeed = normalizeFaceEmbedding(seed || "demo").toUpperCase();
  const digest = crypto.createHash("sha256").update(normalizedSeed).digest();

  const embedding = Array.from({ length: 128 }, (_, index) => {
    const byte = digest[index % digest.length];
    const offset = (index * 31) % 256;
    return Number((((byte + offset) % 256) / 255 - 0.5).toFixed(6));
  });

  return serializeFaceEmbedding(embedding);
}
