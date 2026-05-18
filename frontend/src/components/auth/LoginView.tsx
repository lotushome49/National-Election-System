import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Fingerprint,
  Lock,
  AlertCircle,
  ArrowLeft,
  User,
  Users,
  Activity,
  ChevronRight,
  RefreshCw,
  LayoutDashboard,
  Database,
  CheckCircle2,
} from "lucide-react";
import { unwrapApiData } from "../../utils/mfa";
import { cn } from "../../utils/cn";
import type { Role } from "../../types/election";

export function LoginView({
  setRole,
  setUser,
  setToken,
  setSessionId,
  setView,
  fpHash,
  results,
  t,
  i18n,
}: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authData, setAuthData] = useState({ username: "", password: "" });
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(
    null,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const lang = i18n.language as "en" | "am";

  const [biometricState, setBiometricState] = useState<'idle' | 'initializing' | 'scanning' | 'verifying' | 'failed' | 'success'>('idle');
  const [biometricScore, setBiometricScore] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const startBiometricLogin = async () => {
    if (cooldown > 0) return;
    setBiometricState('initializing');
    setError("");
    
    // Simulate fingerprint sensor initializing (800ms)
    await new Promise(r => setTimeout(r, 800));
    setBiometricState('scanning');
    
    // Simulate scan pattern matching (1200ms)
    await new Promise(r => setTimeout(r, 1200));
    setBiometricState('verifying');
    
    try {
      const endpoint = "/api/auth/login/biometric";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricHash: fpHash }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Authentication failed: Server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Authentication failed");
      }

      const unwrapped = unwrapApiData(data);
      setBiometricState('success');
      setBiometricScore(unwrapped?.matchScore || 100);
      
      // Delay slightly for success animation before finalize
      await new Promise(r => setTimeout(r, 1000));
      finalizeLogin(unwrapped, "VOTER");
    } catch (err: any) {
      setBiometricState('failed');
      const scoreMatch = err.message.match(/highest match: (\d+)%/);
      if (scoreMatch) {
        setBiometricScore(parseInt(scoreMatch[1], 10));
      } else {
        setBiometricScore(null);
      }
      setError(err.message);
      
      // Trigger a 5 seconds cooldown
      setCooldown(5);
    }
  };

  const resetChallengeState = () => {
    setMfaChallengeToken(null);
    setMfaCode("");
    setRecoveryCode("");
    setUseRecoveryCode(false);
    setPendingUser(null);
  };

  const finalizeLogin = (payload: any, fallbackRole: Role) => {
    const resolvedRole = (payload.user?.role ?? fallbackRole) as Role;
    setRole(resolvedRole);
    setToken(payload.token ?? payload.accessToken ?? null);
    setSessionId(payload.sessionId ?? payload.user?.sessionId ?? null);
    setUser(
      payload.user
        ? {
            ...payload.user,
            sessionId: payload.sessionId ?? payload.user?.sessionId ?? null,
          }
        : null,
    );
    setView(resolvedRole === "VOTER" ? "voter-hub" : "dashboard");
    resetChallengeState();
  };

  const loginAs = async (role: Role) => {
    if (role !== "VOTER" && !selectedRole) {
      setSelectedRole(role);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const endpoint =
        role === "VOTER" ? "/api/auth/login/biometric" : "/api/auth/login";
      const requestBody =
        role === "VOTER"
          ? { biometricHash: fpHash }
          : { username: authData.username, password: authData.password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 404) {
        throw new Error(
          "Authentication endpoint not found (404). Please ensure the backend is running.",
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `Server error (Status: ${response.status}). Expected JSON but received ${contentType || "unknown"}`,
        );
      }

      const data = unwrapApiData(await response.json());
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Authentication failed (status ${response.status})`,
        );
      }

      if (data?.requiresMfa) {
        setPendingUser(data.user);
        setMfaChallengeToken(data.challengeToken);
        return;
      }

      finalizeLogin(data, role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeMfaLogin = async () => {
    if (!mfaChallengeToken || (!mfaCode && !recoveryCode)) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: mfaChallengeToken,
          code: useRecoveryCode ? undefined : mfaCode,
          recoveryCode: useRecoveryCode ? recoveryCode : undefined,
        }),
      });

      const data = unwrapApiData(await response.json());
      if (!response.ok) {
        throw new Error(
          data?.message ||
            `MFA verification failed (status ${response.status})`,
        );
      }

      finalizeLogin(
        data,
        (pendingUser?.role ?? selectedRole ?? "ADMIN") as Role,
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center min-h-[70vh] p-4"
    >
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 lg:p-16 border border-slate-100 max-w-xl w-full relative overflow-hidden">
        {/* Dynamic Pattern Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />

        <div className="absolute top-8 right-8">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
        </div>

        <div className="text-center mb-14 relative z-10">
          <div className="bg-slate-900 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-200">
            <ShieldCheck className="text-white" size={44} />
          </div>
          <h2 className="text-5xl font-display font-black mb-3 tracking-tighter text-slate-900">
            {t("citizen_portal")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
            {t("secure_entry")}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl mb-10 flex items-center gap-3 text-xs font-bold"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        <div className="space-y-8 relative z-10">
          {biometricState !== 'idle' ? (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-3xl animate-in fade-in zoom-in duration-300">
              <div className="relative mb-6">
                {/* Glowing Outer Rings */}
                <div className={`absolute -inset-4 rounded-full blur-xl opacity-35 transition-all duration-500 ${
                  biometricState === 'success' ? 'bg-green-500 scale-110' :
                  biometricState === 'failed' ? 'bg-red-500 scale-100' :
                  'bg-election-blue animate-pulse'
                }`} />

                {/* Fingerprint container */}
                <div className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-500 ${
                  biometricState === 'success' ? 'border-green-500 shadow-2xl shadow-green-200' :
                  biometricState === 'failed' ? 'border-red-500 shadow-2xl shadow-red-200' :
                  'border-election-blue shadow-2xl shadow-sky-100'
                }`}>
                  {biometricState === 'success' ? (
                    <CheckCircle2 className="text-green-500 w-16 h-16 animate-bounce" />
                  ) : biometricState === 'failed' ? (
                    <AlertCircle className="text-red-500 w-16 h-16" />
                  ) : (
                    <Fingerprint className={`text-election-blue w-16 h-16 transition-all duration-300 ${
                      biometricState === 'scanning' ? 'scale-110 animate-pulse' : ''
                    }`} />
                  )}

                  {/* Scanning Laser Line */}
                  {(biometricState === 'scanning' || biometricState === 'verifying') && (
                    <motion.div
                      animate={{ top: ["15%", "85%", "15%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      }}
                      className="absolute left-4 right-4 h-1 bg-election-blue rounded-full shadow-[0_0_10px_#0ea5e9]"
                    />
                  )}
                </div>
              </div>

              {/* Status title & description */}
              <h3 className="font-bold text-xl tracking-tight text-slate-800 mb-2">
                {biometricState === 'initializing' && "Initializing Sensor..."}
                {biometricState === 'scanning' && "Scanning Fingerprint..."}
                {biometricState === 'verifying' && "Verifying Signature..."}
                {biometricState === 'success' && "Verification Success!"}
                {biometricState === 'failed' && "Biometric Match Failed"}
              </h3>

              <p className="text-xs text-slate-500 text-center max-w-xs font-mono uppercase tracking-wider mb-6">
                {biometricState === 'initializing' && "Aligning optical reader and loading core cryptography keys..."}
                {biometricState === 'scanning' && `Hashing sensor pattern... SHA256[${fpHash ? fpHash.slice(0, 8) : "INITIALIZING"}...]`}
                {biometricState === 'verifying' && "Executing 1:N Jaccard similarity distance search..."}
                {biometricState === 'success' && `Perfect Match Verified! Score: ${biometricScore}%`}
                {biometricState === 'failed' && (
                  biometricScore !== null 
                    ? `Matching similarity score: ${biometricScore}% (Requires >= 85%)`
                    : "No matching biometric profile found on ledger."
                )}
              </p>

              {/* Action buttons / cooldown indicator */}
              <div className="w-full flex gap-3">
                {biometricState === 'failed' && (
                  <>
                    <button
                      disabled={cooldown > 0}
                      onClick={startBiometricLogin}
                      className="flex-1 bg-election-blue text-white py-3 px-6 rounded-xl text-xs font-bold shadow-lg shadow-election-blue/20 hover:bg-sky-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {cooldown > 0 ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          Retry in {cooldown}s
                        </>
                      ) : (
                        "Scan Again"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setBiometricState('idle');
                        setError("");
                      }}
                      className="flex-1 bg-slate-100 text-slate-600 py-3 px-6 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                      Use Other Account
                    </button>
                  </>
                )}
                {(biometricState === 'initializing' || biometricState === 'scanning' || biometricState === 'verifying') && (
                  <button
                    onClick={() => {
                      setBiometricState('idle');
                      setLoading(false);
                    }}
                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel Scan
                  </button>
                )}
              </div>
            </div>
          ) : !selectedRole ? (
            <>
              <div className="space-y-4">
                <button
                  disabled={loading || cooldown > 0}
                  onClick={startBiometricLogin}
                  className="w-full group bg-slate-900 text-white p-8 rounded-[2rem] font-bold flex items-center justify-between hover:bg-slate-800 transition-all duration-300 disabled:opacity-50 shadow-2xl shadow-slate-300"
                >
                  <div className="flex items-center gap-6">
                    <div className="bg-white/10 p-4 rounded-2xl">
                      <Fingerprint
                        size={28}
                        className="text-white group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="text-left">
                      <span className="block text-2xl tracking-tight leading-none mb-1">
                        {t("voter_login_title")}
                      </span>
                      <p className="text-[10px] opacity-40 uppercase font-black tracking-[0.2em]">
                        {t("step_biometric")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={28}
                    className="opacity-30 group-hover:translate-x-1 transition-transform"
                  />
                </button>

                <div className="pt-10">
                  {!showAdminPanel ? (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 transition-colors"
                    >
                      <Lock size={12} />
                      {t("admin_access")}
                    </button>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                          {t("gateway_status")}
                        </span>
                        <button
                          onClick={() => setShowAdminPanel(false)}
                          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:underline"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          {
                            id: "ADMIN",
                            icon: ShieldCheck,
                            label: "role_admin",
                          },
                          {
                            id: "REGIONAL_ADMIN",
                            icon: LayoutDashboard,
                            label: "role_regional_admin",
                          },
                          {
                            id: "DISTRICT_ADMIN",
                            icon: Database,
                            label: "role_district_admin",
                          },
                          { id: "STAFF", icon: Users, label: "role_staff" },
                          {
                            id: "OBSERVER",
                            icon: Activity,
                            label: "role_observer",
                          },
                        ].map((r: any) => (
                          <button
                            key={r.id}
                            disabled={loading}
                            onClick={() => {
                              setSelectedRole(r.id);
                              resetChallengeState();
                            }}
                            className="bg-white border border-slate-100 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 flex flex-col items-center gap-3 text-center"
                          >
                            <r.icon size={22} />
                            {t(r.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => {
                    if (mfaChallengeToken) {
                      resetChallengeState();
                    } else {
                      setSelectedRole(null);
                    }
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-display font-black text-2xl text-slate-900 uppercase tracking-tighter leading-none mb-1">
                    {t(`role_${selectedRole.toLowerCase()}`)}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    {mfaChallengeToken
                      ? "Second factor required"
                      : t("auth_required")}
                  </p>
                </div>
              </div>

              {!mfaChallengeToken ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                      {t("username")}
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                      />
                      <input
                        type="text"
                        autoFocus
                        value={authData.username}
                        onChange={(e) =>
                          setAuthData({ ...authData, username: e.target.value })
                        }
                        placeholder={t("username")}
                        className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                      {t("password")}
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                      />
                      <input
                        type="password"
                        value={authData.password}
                        onChange={(e) =>
                          setAuthData({ ...authData, password: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => loginAs(selectedRole)}
                    disabled={
                      loading || !authData.username || !authData.password
                    }
                    className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 mt-10 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    <span className="text-sm font-bold uppercase tracking-widest">
                      {t("login_btn")}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-500 leading-relaxed">
                    {pendingUser?.username
                      ? `Password verified for ${pendingUser.username}. `
                      : ""}
                    Enter your 6-digit authenticator code to finish signing in,
                    or switch to a recovery code.
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setUseRecoveryCode(false)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        !useRecoveryCode
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-400 border-slate-100",
                      )}
                    >
                      Authenticator code
                    </button>
                    <button
                      onClick={() => setUseRecoveryCode(true)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        useRecoveryCode
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-400 border-slate-100",
                      )}
                    >
                      Recovery code
                    </button>
                  </div>

                  {!useRecoveryCode ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                        Authenticator code
                      </label>
                      <input
                        autoFocus
                        value={mfaCode}
                        onChange={(event) => setMfaCode(event.target.value)}
                        placeholder="123456"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono tracking-[0.3em]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                        Recovery code
                      </label>
                      <input
                        autoFocus
                        value={recoveryCode}
                        onChange={(event) =>
                          setRecoveryCode(event.target.value)
                        }
                        placeholder="ABCD-EFGH"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono tracking-[0.2em]"
                      />
                    </div>
                  )}

                  <button
                    onClick={completeMfaLogin}
                    disabled={
                      loading ||
                      (!useRecoveryCode && !mfaCode) ||
                      (useRecoveryCode && !recoveryCode)
                    }
                    className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 mt-10 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Complete secure login
                    </span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 mb-4 tracking-wide uppercase">
            {t("voter_reg_info")}
          </p>
          <button
            onClick={() => setView("registration")}
            className="text-election-blue font-medium text-sm flex items-center gap-1 mx-auto hover:underline"
          >
            {t("start_reg")}
          </button>
          <button
            onClick={() => setView("help")}
            className="mt-2 text-slate-400 text-[10px] uppercase font-bold tracking-widest hover:text-slate-600 transition-colors"
          >
            {t("platform_faq")}
          </button>
          <button
            onClick={() => setView("password-reset")}
            className="mt-2 text-slate-400 text-[10px] uppercase font-bold tracking-widest hover:text-slate-600 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </motion.div>
  );
}
