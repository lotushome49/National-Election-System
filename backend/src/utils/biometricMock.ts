export function normalizeBiometricSample(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function computeDeterministicBiometricScore(
  probe: string,
  reference: string,
): number {
  const p = normalizeBiometricSample(probe);
  const r = normalizeBiometricSample(reference);

  if (!p || !r) return 0;
  if (p === r) return 100;

  const probeGrams = buildBigrams(p);
  const refGrams = buildBigrams(r);

  const intersection = [...probeGrams].filter((gram) => refGrams.has(gram)).length;
  const union = new Set([...probeGrams, ...refGrams]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const prefix = commonPrefixLength(p, r) / Math.max(p.length, r.length);
  const lengthDelta =
    Math.abs(p.length - r.length) / Math.max(1, Math.max(p.length, r.length));

  const weighted = jaccard * 0.8 + prefix * 0.25 - lengthDelta * 0.15;
  const score = Math.round(Math.max(0, Math.min(1, weighted)) * 100);

  return score;
}

function buildBigrams(value: string): Set<string> {
  if (value.length < 2) return new Set([value]);

  const grams: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    grams.push(value.slice(i, i + 2));
  }

  return new Set(grams);
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let count = 0;

  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) break;
    count += 1;
  }

  return count;
}
