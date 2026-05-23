import { unwrapApiData } from "../../utils/mfa";

export async function fetchOverview(
  token?: string,
  params?: Record<string, string>,
) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";

  const res = await fetch(`/api/reports/overview${qs}`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return unwrapApiData(data);
}
