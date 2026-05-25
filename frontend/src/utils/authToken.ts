export function isJwtAccessToken(value: string | null | undefined) {
  return Boolean(value && String(value).split(".").length === 3);
}

export function isDemoAccessToken(value: string | null | undefined) {
  if (!isJwtAccessToken(value)) return false;

  try {
    const payloadPart = String(value).split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = atob(padded);
    const payload = JSON.parse(json) as { demo?: boolean };
    return Boolean(payload?.demo);
  } catch {
    return false;
  }
}
