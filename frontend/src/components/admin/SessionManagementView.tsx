import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  LogOut,
  Monitor,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import { unwrapApiData } from "../../utils/mfa";

type SessionRecord = {
  id: string;
  userId: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  ipAddress?: string | null;
  userAgent?: string | null;
  lastSeenAt?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  token: string | null;
  sessionId: string | null;
  setView: (view: string) => void;
  homeView?: string;
  onSessionEnded: () => void;
}

async function fetchAuthed<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const payload = await fetchJson<T | { data: T }>(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  return unwrapApiData(payload);
}

async function fetchAuthedWithFallback<T>(
  urls: string[],
  token: string,
  init?: RequestInit,
): Promise<T> {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      return await fetchAuthed<T>(url, token, init);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to load sessions");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SessionManagementView({
  token,
  sessionId,
  setView,
  homeView,
  onSessionEnded,
}: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = await fetchAuthedWithFallback<SessionRecord[]>(
        ["/api/v1/auth/sessions", "/api/auth/sessions"],
        token,
      );
      setSessions(payload);
    } catch (err: any) {
      setError(err.message ?? "Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [token]);

  const revokeSession = async (id: string) => {
    if (!token) {
      return;
    }

    setSubmitting(id);
    setError("");
    try {
      await fetchAuthedWithFallback(
        [`/api/v1/auth/sessions/${id}`, `/api/auth/sessions/${id}`],
        token,
        {
          method: "DELETE",
        },
      );

      if (id === sessionId) {
        onSessionEnded();
        return;
      }

      await loadSessions();
    } catch (err: any) {
      setError(err.message ?? "Failed to revoke session");
    } finally {
      setSubmitting(null);
    }
  };

  if (!token) {
    return null;
  }

  const activeCount = sessions.filter(
    (session) => session.status === "ACTIVE",
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto pb-20 space-y-10"
    >
      <button
        onClick={() => setView(homeView || "dashboard")}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </button>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 lg:p-14 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <ShieldCheck size={14} className="text-slate-900" />
              Session control
            </div>
            <h2 className="text-4xl lg:text-6xl font-display font-black tracking-tighter text-slate-900 uppercase leading-[0.9]">
              Active sessions
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl uppercase tracking-widest">
              Review live logins, check last activity, and revoke sessions that
              should no longer remain active.
            </p>
          </div>

          <div className="px-6 py-4 rounded-[2rem] border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 w-fit">
            {activeCount} active / {sessions.length} total
          </div>
        </div>

        {error && (
          <div className="px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-300 font-display font-black uppercase tracking-[0.3em]">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-8 rounded-[2rem] border border-slate-100 bg-slate-50 text-sm text-slate-500">
            No active sessions were found for this account.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {sessions.map((session) => {
              const isCurrent = session.id === sessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-[2.5rem] border p-8 shadow-sm space-y-6",
                    isCurrent
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-100 bg-slate-50/60 text-slate-900",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">
                        <Clock3 size={12} />
                        {isCurrent ? "Current session" : "Stored session"}
                      </div>
                      <h3 className="text-2xl font-display font-black tracking-tighter uppercase break-all">
                        {session.id.slice(0, 8)}
                      </h3>
                    </div>

                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] h-fit",
                        session.status === "ACTIVE"
                          ? isCurrent
                            ? "bg-white/10 text-white"
                            : "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {session.status}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm",
                      isCurrent ? "text-white/80" : "text-slate-500",
                    )}
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 opacity-60">
                        IP address
                      </p>
                      <p className="font-mono break-all">
                        {session.ipAddress || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 opacity-60">
                        Last seen
                      </p>
                      <p>
                        {formatDate(session.lastSeenAt || session.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 opacity-60">
                        Expires
                      </p>
                      <p>{formatDate(session.expiresAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 opacity-60">
                        Client
                      </p>
                      <p className="truncate">
                        {session.userAgent || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => revokeSession(session.id)}
                      disabled={submitting === session.id}
                      className={cn(
                        "inline-flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-50",
                        isCurrent
                          ? "bg-white text-slate-900 hover:bg-slate-100"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      )}
                    >
                      {isCurrent ? <LogOut size={14} /> : <Trash2 size={14} />}
                      {submitting === session.id
                        ? "Working..."
                        : isCurrent
                          ? "Sign out"
                          : "Revoke"}
                    </button>
                    {isCurrent && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em]",
                          isCurrent
                            ? "bg-white/10 text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <Monitor size={14} />
                        Current device
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
