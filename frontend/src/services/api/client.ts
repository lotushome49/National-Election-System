export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  // Ensure credentials are included for same-origin requests so cookies (session/csrf) are sent.
  const nextInit: RequestInit = {
    ...init,
    credentials: init?.credentials || "include",
  };

  if (process.env.NODE_ENV === "development") {
    try {
      // eslint-disable-next-line no-console
      console.debug(
        "[fetchJson] requesting",
        typeof input === "string" ? input : input.toString(),
        nextInit,
      );
    } catch (e) {
      // ignore
    }
  }

  const response = await fetch(input, nextInit);
  if (!response.ok) {
    // Try to include server-provided error body in the thrown error for easier debugging
    let body: any = null;
    try {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) body = await response.json();
      else body = await response.text();
    } catch (e) {
      body = null;
    }

    const err = new Error(`HTTP error! status: ${response.status}`) as any;
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return response.json() as Promise<T>;
}
