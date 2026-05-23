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

  if (!p.length || !r.length || p.length !== r.length) return 0;

  let sumSquares = 0;
  for (let i = 0; i < p.length; i += 1) {
    const delta = p[i] - r[i];
    sumSquares += delta * delta;
  }

  const distance = Math.sqrt(sumSquares);
  const similarity = Math.max(0, Math.min(1, 1 - distance / 0.6));

  return Math.round(similarity * 100);
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
