import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import { unwrapApiData } from "../../utils/mfa";

interface Props {
  setView: (view: string) => void;
}

type ResetMode = "request" | "confirm";

type RequestResponse = {
  message: string;
  debug?: {
    userId: string;
    token: string;
    resetUrl: string;
  };
};

function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { score: 0, label: "Enter a new password" };
  if (score <= 2) return { score, label: "Weak" };
  if (score <= 4) return { score, label: "Good" };
  return { score, label: "Strong" };
}

export function PasswordResetView({ setView }: Props) {
  const [mode, setMode] = useState<ResetMode>("request");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const maybeUserId = params.get("userId");
    const maybeToken = params.get("token");

    if (maybeUserId && maybeToken) {
      setMode("confirm");
      setUserId(maybeUserId);
      setToken(maybeToken);
      setStatus("Reset link loaded. Choose a new password to continue.");
    }
  }, []);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const barColor =
    strength.score <= 2
      ? "bg-rose-500"
      : strength.score <= 4
        ? "bg-amber-500"
        : "bg-emerald-500";

  const openResetLink = (url: string) => {
    try {
      const parsed = new URL(url);
      setMode("confirm");
      setUserId(parsed.searchParams.get("userId") ?? "");
      setToken(parsed.searchParams.get("token") ?? "");
      setStatus("Reset link captured. Enter your new password below.");
    } catch {
      setError("Unable to read the reset link.");
    }
  };

  const requestReset = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const response = unwrapApiData(
        await apiRequest<RequestResponse>("/api/password-reset/request", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      );

      setStatus(response.message);
      if (response.debug?.resetUrl) {
        setResetUrl(response.debug.resetUrl);
        openResetLink(response.debug.resetUrl);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");
    try {
      const response = unwrapApiData(
        await apiRequest<{ message: string }>("/api/password-reset/confirm", {
          method: "POST",
          body: JSON.stringify({ userId, token, newPassword }),
        }),
      );

      setStatus(response.message);
      setNewPassword("");
      setConfirmPassword("");
      setResetUrl("");
      setToken("");
      setUserId("");
      setMode("request");
    } catch (err: any) {
      setError(err.message ?? "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const meterWidth = Math.min(100, (strength.score / 6) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[70vh] p-4"
    >
      <div className="bg-white rounded-[3rem] shadow-2xl p-10 lg:p-14 border border-slate-100 max-w-2xl w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-slate-50 rounded-full blur-3xl -mr-36 -mt-36 opacity-60 pointer-events-none" />

        <button
          onClick={() => setView("login")}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors relative z-10"
        >
          <ArrowLeft size={14} />
          Back to login
        </button>

        <div className="mt-8 mb-10 relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">
            <ShieldCheck size={14} className="text-slate-900" />
            Account recovery
          </div>
          <h2 className="text-4xl lg:text-6xl font-display font-black tracking-tighter text-slate-900 uppercase leading-[0.9]">
            Reset password
          </h2>
          <p className="mt-4 text-sm text-slate-400 font-medium uppercase tracking-widest max-w-xl leading-relaxed">
            Request a recovery link, then set a new password with the built-in
            strength meter.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {status && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 size={18} />
            {status}
          </div>
        )}

        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-100 rounded-[2rem] w-fit relative z-10">
          <button
            onClick={() => setMode("request")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              mode === "request" ? "bg-slate-900 text-white" : "text-slate-500",
            )}
          >
            Request link
          </button>
          <button
            onClick={() => setMode("confirm")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              mode === "confirm" ? "bg-slate-900 text-white" : "text-slate-500",
            )}
          >
            Set new password
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-8 relative z-10">
          <section className="space-y-4">
            {mode === "request" ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      placeholder="name@example.com"
                      className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={requestReset}
                  disabled={loading || !email}
                  className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                  <span className="text-sm font-bold uppercase tracking-widest">
                    Send recovery link
                  </span>
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    User ID
                  </label>
                  <input
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    placeholder="Paste from reset link"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Reset token
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <input
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder="Paste from email link"
                      className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    New password
                  </label>
                  <input
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    type="password"
                    placeholder="Create a strong password"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                  />
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Password strength</span>
                      <span>{strength.label}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          barColor,
                        )}
                        style={{ width: `${meterWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Confirm password
                  </label>
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    placeholder="Repeat the new password"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                  />
                </div>

                <button
                  onClick={confirmReset}
                  disabled={
                    loading ||
                    !userId ||
                    !token ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    strength.score < 3
                  }
                  className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck size={20} />
                  )}
                  <span className="text-sm font-bold uppercase tracking-widest">
                    Update password
                  </span>
                </button>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl shadow-slate-200">
              <h3 className="text-xl font-display font-black tracking-tighter uppercase mb-3">
                Security notes
              </h3>
              <ul className="space-y-3 text-xs leading-relaxed opacity-80 list-disc pl-4">
                <li>The reset token expires after 30 minutes.</li>
                <li>Requesting a new link invalidates the previous one.</li>
                <li>Completing a reset revokes all active sessions.</li>
              </ul>
            </div>

            {resetUrl && (
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-[2rem] space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  <Copy size={12} />
                  Dev reset link
                </div>
                <p className="font-mono text-xs text-slate-600 break-all">
                  {resetUrl}
                </p>
                <button
                  onClick={() => navigator.clipboard?.writeText(resetUrl)}
                  className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900 hover:underline"
                >
                  Copy link
                </button>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-[2rem] text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Tip:</strong> In development,
              the backend returns a debug reset link so you can complete the
              flow without an email provider.
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  );
}
