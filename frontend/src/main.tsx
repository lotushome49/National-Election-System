import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// ── CSRF Fetch Interceptor ───────────────────────────────────────────────────
const originalFetch = window.fetch;

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

async function refreshCsrfToken(): Promise<string | null> {
  try {
    const res = await originalFetch("/api/v1/csrf-token");
    if (res.ok) {
      const json = await res.json();
      return json?.data?.csrfToken || null;
    }
  } catch (err) {
    console.error("Failed to pre-fetch CSRF token:", err);
  }
  return null;
}

window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);

  if (!isSafeMethod) {
    let token = getCookie("csrf_token");

    if (!token) {
      token = await refreshCsrfToken();
    }

    if (token) {
      const headers = new Headers(init?.headers);
      headers.set("x-csrf-token", token);

      init = {
        ...init,
        headers,
        credentials: init?.credentials || "include",
      };
    }
  } else {
    if (init && !init.credentials) {
      init.credentials = "include";
    }
  }

  return originalFetch(input, init);
};

// Bootstrap pre-fetch
refreshCsrfToken();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
