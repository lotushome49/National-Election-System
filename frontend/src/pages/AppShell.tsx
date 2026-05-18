import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Vote,
  Fingerprint,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  FileCheck,
  LogOut,
  ChevronRight,
  AlertCircle,
  Database,
  Users,
  CheckCircle2,
  Activity,
  BarChart3,
  Clock,
  HelpCircle,
  Search,
  X,
  ArrowLeft,
  User,
  Lock,
  Shield,
  Menu,
  PieChart,
  Globe,
  ChevronLeft,
  MoreVertical,
  Download,
  UserPlus,
  Edit2,
  Trash2,
} from "lucide-react";
import { CandidateDetailModal } from "../components/candidates/CandidateDetailModal";
import { GeographyManagementView } from "../components/admin/GeographyManagementView";
import { MfaSecurityView } from "../components/admin/MfaSecurityView";
import { PasswordResetView } from "../components/auth/PasswordResetView";
import { SessionManagementView } from "../components/admin/SessionManagementView";
import { ObserverEvidenceView } from "../components/observer/ObserverEvidenceView";
import { LogItem } from "../components/results/LogItem";
import { StatCard } from "../components/results/StatCard";
import { checkPerm } from "../constants/permissions";
import { useElectionRealtime } from "../hooks/useElectionRealtime";
import { useFingerprint } from "../hooks/useFingerprint";
import type { Candidate, Role } from "../types/election";
import { cn } from "../utils/cn";
import { isMfaEligibleRole, unwrapApiData } from "../utils/mfa";
import {
  getScopeAccessModel,
  getUserDistrictId,
  getUserRegionId,
} from "../utils/scope";
import "../i18n";

// --- Main Components ---

export default function AppShell() {
  const [role, setRole] = useState<Role | "NONE">("NONE");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [view, setView] = useState<string>("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "am";
  const fpHash = useFingerprint();
  const { results, electionPhase, setElectionPhase } =
    useElectionRealtime(token);
  const canManageObserverEvidence = role === "OBSERVER" || role === "ADMIN";

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Best effort logout; clear local state even if the revoke request fails.
    } finally {
      clearAuthState();
    }
  };

  const clearAuthState = () => {
    setRole("NONE");
    setUser(null);
    setToken(null);
    setSessionId(null);
    setView("login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Sidebar for Desktop */}
      {token && (
        <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl shadow-slate-200">
              <Vote size={26} className="text-white" />
            </div>
            <div>
              <span className="font-display font-black text-2xl tracking-tighter text-slate-900 leading-none block">
                NEHS
              </span>
              <p className="text-[9px] font-black text-et-green uppercase tracking-[0.2em] mt-0.5">
                {t("election_board")}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <button
              onClick={() => setView("dashboard")}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                view === "dashboard"
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
              )}
            >
              <LayoutDashboard size={18} />
              <span className="text-sm tracking-tight">{t("dashboard")}</span>
            </button>

            {checkPerm(role, "VIEW_VOTERS") && (
              <button
                onClick={() => setView("voters")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "voters"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <UserCheck size={18} />
                <span className="text-sm tracking-tight">
                  {t("voter_registry")}
                </span>
              </button>
            )}

            {checkPerm(role, "REGISTER_VOTER") && (
              <button
                onClick={() => setView("registration")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "registration"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <FileCheck size={18} />
                <span className="text-sm tracking-tight">
                  {t("registration")}
                </span>
              </button>
            )}

            {checkPerm(role, "MANAGE_USERS") && (
              <button
                onClick={() => setView("users")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "users"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Lock size={18} />
                <span className="text-sm tracking-tight">
                  {t("user_management")}
                </span>
              </button>
            )}

            {checkPerm(role, "VIEW_AUDIT_LOGS") && (
              <button
                onClick={() => setView("audit-logs")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "audit-logs"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Database size={18} />
                <span className="text-sm tracking-tight">
                  {t("audit_logs")}
                </span>
              </button>
            )}

            {checkPerm(role, "VIEW_RESULTS") && (
              <button
                onClick={() => setView("results-dashboard")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "results-dashboard"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <PieChart size={18} />
                <span className="text-sm tracking-tight">
                  {t("results_console")}
                </span>
              </button>
            )}

            {canManageObserverEvidence && (
              <button
                onClick={() => setView("observer-evidence")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "observer-evidence"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <ShieldCheck size={18} />
                <span className="text-sm tracking-tight">Evidence</span>
              </button>
            )}

            {token && (
              <button
                onClick={() => setView("sessions")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "sessions"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Clock size={18} />
                <span className="text-sm tracking-tight">Sessions</span>
              </button>
            )}

            {(checkPerm(role, "MANAGE_REGIONS") ||
              checkPerm(role, "MANAGE_DISTRICTS") ||
              checkPerm(role, "MANAGE_POLLING_STATIONS")) && (
              <button
                onClick={() => setView("geography")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "geography"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Globe size={18} />
                <span className="text-sm tracking-tight">Geography</span>
              </button>
            )}

            {isMfaEligibleRole(role) && (
              <button
                onClick={() => setView("security")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "security"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Shield size={18} />
                <span className="text-sm tracking-tight">Security</span>
              </button>
            )}

            {role === "VOTER" && (
              <button
                onClick={() => setView("voter-hub")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "voter-hub"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <User size={18} />
                <span className="text-sm tracking-tight">{t("voter_hub")}</span>
              </button>
            )}

            <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
              <button
                onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
              >
                <Globe size={16} />
                {lang === "en" ? "አማርኛ" : "English"}
              </button>

              <div className="px-5 py-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">
                  {t("terminal_session")}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-700">
                    {user?.fullName || "Guest"}
                  </span>
                </div>
                <p className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase whitespace-normal break-all">
                  ID: {user?.id.slice(-12) || "---"}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all group"
            >
              <LogOut
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span className="tracking-tight">{t("logout")}</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        {token && (
          <nav className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-40">
            <div className="font-display font-bold text-lg">NEHS</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
                className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500"
              >
                {lang === "en" ? "አማርኛ" : "English"}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu />
              </button>
            </div>
          </nav>
        )}

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-white border-b border-slate-200 p-6 space-y-4 z-30"
          >
            <button
              onClick={() => {
                setView("dashboard");
                setMobileMenuOpen(false);
              }}
              className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
            >
              {t("dashboard")}
            </button>
            {checkPerm(role, "VIEW_VOTERS") && (
              <button
                onClick={() => {
                  setView("voters");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("voter_registry")}
              </button>
            )}
            {checkPerm(role, "REGISTER_VOTER") && (
              <button
                onClick={() => {
                  setView("registration");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("registration")}
              </button>
            )}
            {checkPerm(role, "MANAGE_USERS") && (
              <button
                onClick={() => {
                  setView("users");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("user_management")}
              </button>
            )}
            {checkPerm(role, "VIEW_AUDIT_LOGS") && (
              <button
                onClick={() => {
                  setView("audit-logs");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("audit_logs")}
              </button>
            )}
            {checkPerm(role, "VIEW_RESULTS") && (
              <button
                onClick={() => {
                  setView("results-dashboard");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("results_console")}
              </button>
            )}
            {token && (
              <button
                onClick={() => {
                  {
                    canManageObserverEvidence && (
                      <button
                        onClick={() => {
                          setView("observer-evidence");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
                      >
                        Evidence
                      </button>
                    );
                  }
                  setView("sessions");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                Sessions
              </button>
            )}
            {(checkPerm(role, "MANAGE_REGIONS") ||
              checkPerm(role, "MANAGE_DISTRICTS") ||
              checkPerm(role, "MANAGE_POLLING_STATIONS")) && (
              <button
                onClick={() => {
                  setView("geography");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                Geography
              </button>
            )}
            {isMfaEligibleRole(role) && (
              <button
                onClick={() => {
                  setView("security");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                Security
              </button>
            )}
            {role === "VOTER" && (
              <button
                onClick={() => {
                  setView("voter-hub");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {t("voter_hub")}
              </button>
            )}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left font-bold text-red-600 p-3 hover:bg-red-50 rounded-xl"
            >
              {t("logout")}
            </button>
          </motion.div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
          {/* Phase Banner */}
          {role !== "VOTER" && (
            <div
              className={cn(
                "mb-12 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm max-w-fit mx-auto flex items-center gap-1.5 overflow-hidden",
              )}
            >
              <div
                className={cn(
                  "px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2",
                  electionPhase === "REGISTRATION"
                    ? "bg-et-green"
                    : electionPhase === "VOTING"
                      ? "bg-election-orange"
                      : "bg-slate-600",
                )}
              >
                <Clock size={14} />
                {t(`phase_${electionPhase.toLowerCase()}`)}
              </div>
              <div className="px-4 py-2 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t("live_monitoring")}
                </span>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {/* View Switching (keep existing render logic) */}
            {view === "login" && (
              <LoginView
                key="login"
                setRole={setRole}
                setUser={setUser}
                setToken={setToken}
                setSessionId={setSessionId}
                setView={setView}
                fpHash={fpHash}
                results={results}
                t={t}
                i18n={i18n}
              />
            )}
            {view === "password-reset" && (
              <PasswordResetView setView={setView} />
            )}
            {view === "help" && (
              <HelpView setView={setView} role={role} t={t} i18n={i18n} />
            )}
            {view === "history" && (
              <HistoryView setView={setView} role={role} t={t} i18n={i18n} />
            )}
            {view === "voters" && checkPerm(role, "VIEW_VOTERS") && (
              <VoterRegistryView
                setView={setView}
                token={token}
                t={t}
                i18n={i18n}
                user={user}
              />
            )}
            {view === "users" && checkPerm(role, "MANAGE_USERS") && (
              <UserManagementView
                setView={setView}
                token={token}
                t={t}
                i18n={i18n}
                user={user}
              />
            )}
            {view === "audit-logs" && checkPerm(role, "VIEW_AUDIT_LOGS") && (
              <AuditLogsView
                setView={setView}
                token={token}
                t={t}
                i18n={i18n}
              />
            )}
            {view === "results-dashboard" &&
              checkPerm(role, "VIEW_RESULTS") && (
                <ResultsDashboardView
                  setView={setView}
                  token={token}
                  t={t}
                  i18n={i18n}
                />
              )}
            {view === "geography" &&
              (checkPerm(role, "MANAGE_REGIONS") ||
                checkPerm(role, "MANAGE_DISTRICTS") ||
                checkPerm(role, "MANAGE_POLLING_STATIONS")) && (
                <GeographyManagementView
                  setView={setView}
                  token={token}
                  user={user}
                />
              )}
            {view === "security" && isMfaEligibleRole(role) && (
              <MfaSecurityView setView={setView} token={token} />
            )}
            {view === "sessions" && token && (
              <SessionManagementView
                token={token}
                sessionId={sessionId}
                setView={setView}
                onSessionEnded={clearAuthState}
              />
            )}
            {view === "observer-evidence" && canManageObserverEvidence && (
              <ObserverEvidenceView
                token={token}
                role={role}
                setView={setView}
              />
            )}
            {view === "voter-hub" && role === "VOTER" && (
              <VoterHub
                key="voter"
                user={user}
                token={token}
                setView={setView}
                t={t}
                role={role}
                electionPhase={electionPhase}
                i18n={i18n}
              />
            )}
            {view === "registration" &&
              (electionPhase === "REGISTRATION" ? (
                <RegistrationView
                  key="reg"
                  setView={setView}
                  fpHash={fpHash}
                  t={t}
                  canRegister={checkPerm(role, "REGISTER_VOTER")}
                  role={role}
                  token={token}
                  i18n={i18n}
                />
              ) : (
                <div className="max-w-md mx-auto text-center py-20">
                  <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800">
                    {t("registration_closed")}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {t("registration_closed_desc", { phase: electionPhase })}
                  </p>
                  <button
                    onClick={() =>
                      setView(
                        role === "VOTER"
                          ? "voter-hub"
                          : role === "NONE"
                            ? "login"
                            : "dashboard",
                      )
                    }
                    className="mt-8 bg-election-dark text-white px-8 py-3 rounded-xl font-bold"
                  >
                    {t("return_home")}
                  </button>
                </div>
              ))}
            {view === "voting-booth" &&
              (role === "VOTER" || checkPerm(role, "MANAGE_ELECTION")) &&
              (electionPhase === "VOTING" || role === "ADMIN" ? (
                <VotingBoothView
                  key="booth"
                  token={token}
                  setView={setView}
                  setUser={setUser}
                  fpHash={fpHash}
                  role={role}
                  t={t}
                  i18n={i18n}
                />
              ) : (
                <div className="max-w-md mx-auto text-center py-20">
                  <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800">
                    {t("voting_inactive")}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {t("registration_closed_desc", { phase: electionPhase })}
                  </p>
                  <button
                    onClick={() => setView("voter-hub")}
                    className="mt-8 bg-election-dark text-white px-8 py-3 rounded-xl font-bold"
                  >
                    {t("return_portal")}
                  </button>
                </div>
              ))}
            {view === "dashboard" && token && role !== "VOTER" && (
              <DashboardView
                key="dash"
                results={results}
                role={role}
                setView={setView}
                t={t}
                user={user}
                electionPhase={electionPhase}
                setElectionPhase={setElectionPhase}
                token={token}
                i18n={i18n}
              />
            )}
            {view === "dashboard" && role === "VOTER" && (
              <div className="max-w-md mx-auto text-center py-20">
                <ShieldCheck
                  size={48}
                  className="mx-auto text-slate-200 mb-4"
                />
                <h3 className="text-xl font-bold text-slate-800">
                  Administrative Access Required
                </h3>
                <p className="text-slate-500 text-sm mt-2">
                  The administrative dashboard is reserved for authorized
                  election officials. As a voter, you can only access your
                  personal Voter Hub.
                </p>
                <button
                  onClick={() => setView("voter-hub")}
                  className="mt-8 bg-election-dark text-white px-8 py-3 rounded-xl font-bold"
                >
                  Return to Voter Hub
                </button>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- View: Login ---
function LoginView({
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
          {!selectedRole ? (
            <>
              <div className="space-y-4">
                <button
                  disabled={loading}
                  onClick={() => loginAs("VOTER")}
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

// --- View: Registration ---
function RegistrationView({
  setView,
  fpHash,
  t,
  canRegister,
  role,
  token,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  // Public registration is allowed if role is NONE
  const isAuthorized = role === "NONE" || canRegister;

  const [step, setStep] = useState(0);
  const [nidInput, setNidInput] = useState("");
  const [nidError, setNidError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    nationalId: "",
    address: "",
    email: "",
    phone: "",
    regionId: "r1",
    isCitizen: false,
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl border border-red-100">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">{t("error")}</h2>
        <p className="text-slate-500 mb-6">
          Unauthorized: your role does not have registration permissions.
        </p>
        <button
          onClick={() => setView("dashboard")}
          className="w-full bg-election-dark text-white p-3 rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleVerifyNid = async () => {
    if (!nidInput.trim()) return;
    setLoading(true);
    setNidError("");
    try {
      const response = await fetch(`/api/citizen/${nidInput}`);

      if (response.status === 404) {
        throw new Error(t("nid_error") + " (Citizen database not found)");
      }

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Invalid server response format.");
      }

      if (!response.ok) {
        throw new Error(data.error || t("nid_error"));
      }

      setFormData({
        ...formData,
        fullName: data.fullName,
        dob: data.dob,
        nationalId: data.nationalId,
        address: data.address,
        phone: data.phone || "",
        isCitizen: data.citizenshipStatus === "Ethiopian",
        gender: data.gender || "",
      });
      setStep(1);
    } catch (err: any) {
      setNidError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component

  // Handle camera access for Step 3
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (step === 3) {
      const startCamera = async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          currentStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          console.error("Camera access failed", err);
          alert(
            "Could not access camera for facial biometrics. Please check permissions.",
          );
          setStep(2);
        }
      };
      startCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  // Ensure video element gets the stream even if Ref was null initially
  useEffect(() => {
    if (
      step === 3 &&
      stream &&
      videoRef.current &&
      !videoRef.current.srcObject
    ) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const handleSubmit = async () => {
    if (!fpHash) {
      alert(
        "Biometric initialization incomplete. Please refresh or check your browser settings.",
      );
      return;
    }
    setLoading(true);
    // Stop camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    try {
      const response = await fetch("/api/auth/register-voter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...formData, biometricHash: fpHash }),
      });

      if (response.status === 404) {
        throw new Error("Registration service is currently unavailable (404).");
      }

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error(
          "Registration failed: Server returned an invalid response.",
        );
      }

      if (data?.error) throw new Error(data.error);
      setSuccessData(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("reg_success")}</h2>
        <p className="text-slate-500 mb-4">{t("reg_success_desc")}</p>

        {successData.voterId && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t("unique_voter_id")}
            </p>
            <p className="text-xl font-mono font-bold text-election-dark tracking-tighter">
              {successData.voterId}
            </p>
          </div>
        )}

        <button
          onClick={() => setView("login")}
          className="bg-election-blue text-white px-8 py-3 rounded-xl font-medium w-full"
        >
          {t("return_home")}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <button
            onClick={() => setView("login")}
            className="text-xs text-slate-400 hover:text-slate-600 uppercase tracking-widest font-bold mb-4 flex items-center gap-1"
          >
            ← {t("cancel")}
          </button>
          <h2 className="text-3xl font-bold">{t("reg_title")}</h2>
          <p className="text-slate-500">{t("reg_desc")}</p>
        </div>
        <button
          onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
          className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200"
        >
          {lang === "en" ? "Amharic (አማርኛ)" : "English"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              {t("region")}
            </label>
            <select
              value={formData.regionId}
              onChange={(e) =>
                setFormData({ ...formData, regionId: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-sm font-medium"
            >
              {[...Array(11)].map((_, i) => (
                <option key={i} value={`r${i + 1}`}>
                  {t(`r${i + 1}`)}
                </option>
              ))}
            </select>
          </div>

          {step === 0 ? (
            <div className="space-y-6">
              <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                <Search className="mx-auto text-election-blue mb-2" size={32} />
                <h3 className="font-bold text-slate-900">
                  {t("search_citizen")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t("nid_desc")}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("national_id")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nidInput}
                    onChange={(e) => setNidInput(e.target.value)}
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all font-mono"
                    placeholder={t("nid_placeholder")}
                    onKeyPress={(e) => e.key === "Enter" && handleVerifyNid()}
                  />
                  <button
                    onClick={handleVerifyNid}
                    disabled={loading || !nidInput.trim()}
                    className="bg-election-blue text-white px-6 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    {t("verify_nid")}
                  </button>
                </div>
                {nidError && (
                  <p className="text-xs text-red-500 font-medium ml-1">
                    {nidError}
                  </p>
                )}
                <div className="p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 font-mono italic">
                  Try simulated IDs: NID-123456, NID-654321
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 italic">
                  * Manual entry is restricted for election integrity. Please
                  use your biometric-linked National ID.
                </p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{t("step_personal")}</h3>
                {formData.nationalId && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={10} /> {t("nid_verified")}
                  </span>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("full_name")}
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_name")}
                  readOnly={!!formData.nationalId}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("dob")}
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData({ ...formData, dob: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all text-sm"
                    readOnly={!!formData.nationalId}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("national_id")}
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("placeholder_id")}
                    readOnly={!!formData.nationalId}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("gender")}
                  </label>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("gender")}
                    readOnly={!!formData.nationalId}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("phone")}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("placeholder_phone")}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("address")}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_address")}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_email")}
                />
              </div>
              <div className="flex items-start gap-3 p-2">
                <input
                  type="checkbox"
                  id="isCitizen"
                  checked={formData.isCitizen}
                  onChange={(e) =>
                    setFormData({ ...formData, isCitizen: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded text-election-blue focus:ring-election-blue"
                  disabled={!!formData.nationalId}
                />
                <label
                  htmlFor="isCitizen"
                  className="text-sm text-slate-600 leading-tight"
                >
                  {t("citizen_confirm")}
                </label>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={
                    !formData.fullName ||
                    !formData.nationalId ||
                    !formData.dob ||
                    !formData.address ||
                    !formData.isCitizen
                  }
                  className="flex-[2] bg-election-dark text-white p-4 rounded-xl font-medium disabled:opacity-50"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6">
              <div className="bg-election-dark/5 p-6 rounded-xl border border-dashed border-slate-300">
                <div className="flex flex-col items-center text-center">
                  <Fingerprint
                    size={64}
                    className="text-election-blue mb-4 animate-pulse"
                  />
                  <h3 className="font-bold text-lg">
                    {t("biometric_consent")}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {t("consent_text")}
                  </p>
                  <div className="mt-6 flex gap-2">
                    <span className="inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-mono text-green-600 uppercase tracking-tighter">
                      {t("step_biometric")} Ready: {fpHash.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-election-blue text-white p-4 rounded-xl font-medium shadow-lg shadow-election-blue/20"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative group border-4 border-election-blue/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-dashed border-election-blue/50 rounded-[4rem] relative">
                    <motion.div
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: "linear",
                      }}
                      className="absolute left-0 right-0 h-0.5 bg-election-blue shadow-[0_0_15px_#0ea5e9]"
                    />
                  </div>
                  <p className="mt-4 text-[10px] font-mono text-white/70 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                    {t("placeholder_face")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] bg-election-blue text-white p-4 rounded-xl font-medium shadow-lg shadow-election-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    t("loading")
                  ) : (
                    <>
                      <UserCheck size={20} />
                      {t("complete_reg")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 text-white p-6 rounded-2xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-election-blue" />
              {t("security_notice")}
            </h4>
            <ul className="text-xs space-y-3 opacity-80 list-disc pl-4 font-mono">
              <li>{t("security_notice_1")}</li>
              <li>{t("security_notice_2")}</li>
              <li>{t("security_notice_3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- View: Voter Hub ---
function VoterHub({ user, setView, t, role, electionPhase, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-20"
    >
      {/* Current Election Phase Banner */}
      <div className="mb-12 flex flex-col md:flex-row items-center gap-4">
        <div
          className={cn(
            "px-6 py-3 rounded-2xl border flex items-center gap-3 shadow-sm",
            electionPhase === "REGISTRATION"
              ? "bg-blue-50 border-blue-100 text-blue-600"
              : electionPhase === "VOTING"
                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                : "bg-slate-100 border-slate-200 text-slate-500",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              electionPhase === "REGISTRATION"
                ? "bg-blue-500"
                : electionPhase === "VOTING"
                  ? "bg-emerald-500"
                  : "bg-slate-400",
            )}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
            {t(`phase_${electionPhase.toLowerCase()}`)}
          </p>
        </div>
        <div className="h-px bg-slate-100 flex-1 hidden md:block" />
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          {electionPhase === "REGISTRATION" && t("reg_open_voting_closed")}
          {electionPhase === "VOTING" && t("voting_open")}
          {electionPhase === "CLOSED" && t("election_closed")}
        </p>
      </div>

      {/* Header with Secure Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Lock size={12} />
            {t("secure_session")}
          </div>
          <h2 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9]">
            {t("voter_welcome", { name: String(user.fullName).split(" ")[0] })}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-wide">
            {t("verified_citizen_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          {scopeAccess.role !== "ADMIN" && (
            <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100">
              {scopeAccess.summaryLabel}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() =>
                i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
              }
              className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl font-bold text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
            >
              {lang === "en" ? "አማርኛ" : "English"}
            </button>
            <div className="px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                {t("status_verified")}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-slate-300 uppercase tracking-widest mb-1">
              {t("terminal_key")}
            </p>
            <p className="text-xs font-mono font-black text-slate-900 uppercase tracking-tighter break-all bg-slate-100 px-3 py-1 rounded-lg">
              {user.id.slice(0, 12)}—{role || "VTR"}—SEC—
              {"ETX" +
                Math.random().toString(36).substring(7, 10).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Main Ballot Card */}
        <div className="lg:col-span-8 space-y-12">
          <div
            className={cn(
              "p-10 lg:p-16 rounded-[4rem] border transition-all duration-700 relative overflow-hidden group",
              user.hasVoted
                ? "bg-slate-50 border-slate-100"
                : "bg-white border-slate-100 shadow-2xl shadow-slate-200",
            )}
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />

            {user.hasVoted && (
              <div className="absolute top-10 right-10 bg-emerald-500 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-emerald-100 animate-in zoom-in duration-500">
                <CheckCircle2 size={14} />
                {t("ballot_anchored")}
              </div>
            )}

            <div
              className={cn(
                "p-6 rounded-[2rem] w-fit mb-12 transition-all duration-700",
                user.hasVoted
                  ? "bg-slate-200 text-slate-400"
                  : "bg-slate-900 text-white shadow-2xl shadow-slate-300 group-hover:scale-110",
              )}
            >
              <Vote size={48} />
            </div>

            <div className="mb-14 relative z-10">
              <h3 className="text-4xl lg:text-5xl font-display font-black text-slate-900 mb-4 tracking-tighter">
                {t("ballot_title")}
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg uppercase tracking-wide">
                {user.hasVoted ? t("ballot_voted_desc") : t("step_2_desc")}
              </p>
            </div>

            {user.hasVoted ? (
              <div className="space-y-6 lg:max-w-md relative z-10">
                <div className="flex items-center gap-4 text-emerald-600 font-bold text-sm bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="p-3 bg-emerald-100 rounded-2xl">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                      {t("verification")}
                    </span>
                    <span className="text-lg tracking-tight leading-none">
                      {t("vote_success")}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 font-mono text-[10px] text-slate-400 flex flex-col gap-2">
                  <span className="uppercase font-black text-slate-300 tracking-[0.2em]">
                    {t("receipt_token")}
                  </span>
                  <span className="break-all font-bold text-slate-500">
                    TX—VOTE—SHA—256—
                    {"ET" +
                      Math.random().toString(36).substring(2, 20).toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                <button
                  onClick={() =>
                    electionPhase === "VOTING" && setView("voting-booth")
                  }
                  disabled={electionPhase !== "VOTING"}
                  className={cn(
                    "px-12 py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all duration-500",
                    electionPhase === "VOTING"
                      ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-2xl shadow-slate-300 hover:shadow-slate-400"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {electionPhase === "VOTING"
                    ? t("cast_ballot")
                    : t("voting_inactive")}
                  <ChevronRight size={24} />
                </button>
                <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Clock size={16} />
                  {t("polls_close_in")} 06:42:15
                </div>
              </div>
            )}
          </div>

          {/* Privacy & Protocol Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm transform hover:-translate-y-1 transition-transform">
              <div className="bg-slate-900 text-white p-4 rounded-2xl w-fit mb-8 shadow-xl shadow-slate-100">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-display font-black text-slate-900 text-xl mb-3 tracking-tighter uppercase">
                {t("privacy_protocol")}
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("privacy_protocol_desc")}
              </p>
            </div>
            <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm transform hover:-translate-y-1 transition-transform">
              <div className="bg-emerald-500 text-white p-4 rounded-2xl w-fit mb-8 shadow-xl shadow-emerald-100">
                <Activity size={28} />
              </div>
              <h4 className="font-display font-black text-slate-900 text-xl mb-3 tracking-tighter uppercase">
                {t("real_time_verify")}
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("real_time_verify_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar: My Data */}
        <div className="lg:col-span-4 space-y-12">
          <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-12">
                <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/20 shadow-inner">
                  <User size={32} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-[0.3em] text-[10px] opacity-40 mb-1">
                    {t("private_record")}
                  </h4>
                  <p className="font-display font-black text-xl tracking-tight leading-none">
                    {user.fullName}
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                    {t("national_identifier")}
                  </span>
                  <p className="font-mono text-sm tracking-tighter bg-white/5 p-4 rounded-2xl border border-white/10 text-white/70">
                    {String(user.id).slice(0, 16)}••••••••
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                    {t("biometric_status")}
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl w-fit border border-emerald-400/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {t("hash_verified")}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                    {t("regional_assignment")}
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] bg-white text-slate-900 w-fit px-4 py-2 rounded-xl shadow-lg">
                    {user.regionId ? t(user.regionId) : t("unassigned")}
                  </p>
                </div>
              </div>
            </div>
            <Fingerprint
              className="absolute -right-20 -bottom-20 opacity-[0.05] text-white rotate-12"
              size={320}
            />
          </div>

          <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm">
            <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <BarChart3 size={18} className="text-slate-400" />
              {t("participation_stats")}
            </h4>
            <div className="space-y-8">
              <div className="flex justify-between items-center group/stat">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("cycle_participation")}
                </span>
                <span className="font-display font-black text-xl text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                  100%
                </span>
              </div>
              <div className="flex justify-between items-center group/stat">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("uptime")}
                </span>
                <span className="font-display font-black text-xl text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">
                  99.99
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("encryption")}
                </span>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> TLS 1.3
                </span>
              </div>
            </div>
            <button
              onClick={() => setView("help")}
              className="w-full mt-12 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
            >
              {t("whitepaper")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- View: Voting Booth ---
function VotingBoothView({
  token,
  setView,
  setUser,
  fpHash,
  role,
  t,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(role === "ADMIN" ? 1 : 0); // Admins skip biometric auth for this demo bypass
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<Candidate | null>(
    null,
  );
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const candidates: Candidate[] = [
    {
      id: "c1",
      name: t("c1_name"),
      party: "Prosperity Party",
      symbol: "💡",
      photoUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Prime_Minister_of_Ethiopia_Abiy_Ahmed_Ali_%28cropped%29.jpg/500px-Prime_Minister_of_Ethiopia_Abiy_Ahmed_Ali_%28cropped%29.jpg?v=2",
      bio: t("c1_bio"),
      manifesto: t("c1_manifesto"),
      platform: t("c1_platform"),
      votes: 0,
    },
    {
      id: "c2",
      name: t("c2_name"),
      party: "OFN",
      symbol: "⛰️",
      photoUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Jawar_Mohammed_%28cropped%29.jpg/500px-Jawar_Mohammed_%28cropped%29.jpg",
      bio: t("c2_bio"),
      manifesto: t("c2_manifesto"),
      platform: t("c2_platform"),
      votes: 0,
    },
    {
      id: "c3",
      name: t("c3_name"),
      party: "EZEMA",
      symbol: "🛡️",
      photoUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Minister_of_Education_Birhanu_Nega.jpg/500px-Minister_of_Education_Birhanu_Nega.jpg",
      bio: t("c3_bio"),
      manifesto: t("c3_manifesto"),
      platform: t("c3_platform"),
      votes: 0,
    },
    {
      id: "c4",
      name: t("c4_name"),
      party: "Coalition of Youth",
      symbol: "🦅",
      photoUrl: "https://picsum.photos/seed/independent/400/400",
      bio: t("c4_bio"),
      manifesto: t("c4_manifesto"),
      platform: t("c4_platform"),
      votes: 0,
    },
  ];

  const handleForceFinalize = async () => {
    if (!confirm(t("confirm_finalize"))) return;

    setSubmitting(true);
    try {
      const resp = await fetch("/api/admin/force-finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setView("dashboard");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step === 0 && !stream) {
      const startCamera = async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          console.error("Camera access failed", err);
          alert("Biometric check required to unlock ballot.");
          setView("voter-hub");
        }
      };
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  const handleVerifyBiometrics = () => {
    // Simulate real-time biometric matching against voter record
    setSubmitting(true);
    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setSubmitting(false);
      setStep(1);
    }, 2000);
  };

  const handleCastVote = async () => {
    setSubmitting(true);
    try {
      const resp = await fetch("/api/vote/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidateId: selected }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setUser((prev: any) => ({ ...prev, hasVoted: true }));
      setStep(3);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      {step === 0 && (
        <div className="max-w-md mx-auto text-center space-y-8">
          <div>
            <h2 className="text-3xl font-bold">{t("step_1_title")}</h2>
            <p className="text-slate-500 mt-2">{t("step_1_desc")}</p>
          </div>

          <div className="bg-slate-900 rounded-3xl overflow-hidden aspect-square relative border-8 border-white shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-election-blue rounded-full relative overflow-hidden">
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute left-0 right-0 h-1 bg-election-blue shadow-[0_0_20px_white]"
                />
              </div>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full flex gap-3 items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-white/80 uppercase tracking-widest leading-none">
                {t("terminal_id")}: {token?.slice(-8)}
              </span>
            </div>
          </div>

          <button
            disabled={submitting}
            onClick={handleVerifyBiometrics}
            className="w-full bg-election-blue text-white p-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Clock className="animate-spin" /> {t("logging_in")}
              </>
            ) : (
              <>
                <UserCheck /> {t("access_portal")}
              </>
            )}
          </button>
          <button
            onClick={() => setView("voter-hub")}
            className="text-slate-400 text-xs font-bold hover:text-slate-600 uppercase tracking-widest"
          >
            {t("return_portal")}
          </button>
        </div>
      )}

      {step === 1 && (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <ShieldCheck size={14} className="text-slate-900" />
                {t("encrypted_ballot_active")}
              </div>
              <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
                {t("select_candidate")}
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-wide">
                {t("step_2_desc")}
              </p>
            </div>

            <div className="flex flex-col lg:items-end gap-6">
              <div className="px-6 py-3 bg-slate-900 text-white rounded-[1.5rem] flex items-center gap-4 shadow-2xl shadow-slate-200 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  {t("terminal_secured")}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-12 h-1.5 rounded-full transition-all duration-500",
                      i === step + 1 ? "bg-slate-900 w-20" : "bg-slate-200",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {candidates.map((c) => (
              <motion.div
                key={c.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="relative"
              >
                <motion.button
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "w-full text-left p-10 rounded-[3rem] border transition-all duration-500 relative overflow-hidden group",
                    selected === c.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]"
                      : "bg-white border-slate-100 hover:border-slate-300 shadow-sm",
                  )}
                >
                  {/* Highlight */}
                  <div
                    className={cn(
                      "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-30 transition-opacity",
                      selected === c.id ? "bg-white/20" : "bg-slate-100",
                    )}
                  />

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 shrink-0 relative">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="w-full h-full object-cover rounded-2xl shadow-xl border-2 border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-4xl bg-slate-50 w-full h-full flex items-center justify-center rounded-2xl border border-slate-100 font-display font-black">
                          {c.symbol}
                        </div>
                      )}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 p-1 rounded-lg shadow-sm text-[10px] font-black border",
                          selected === c.id
                            ? "bg-white text-slate-900 border-white/20"
                            : "bg-white text-slate-400 border-slate-50",
                        )}
                      >
                        {c.symbol}
                      </div>
                    </div>
                    <div>
                      <h4
                        className={cn(
                          "font-display font-black text-2xl tracking-tighter uppercase leading-none mb-1",
                          selected === c.id ? "text-white" : "text-slate-900",
                        )}
                      >
                        {c.name}
                      </h4>
                      <p
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          selected === c.id
                            ? "text-white/40"
                            : "text-slate-400",
                        )}
                      >
                        {c.party}
                      </p>
                    </div>
                  </div>
                  {selected === c.id && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-10 left-10 p-2 bg-white text-slate-900 rounded-full shadow-xl z-20"
                    >
                      <CheckCircle2 size={24} />
                    </motion.div>
                  )}
                </motion.button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCandidate(c);
                  }}
                  className="absolute bottom-4 right-4 p-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                >
                  <Search size={14} />
                  {t("view_details")}
                </button>
              </motion.div>
            ))}
          </motion.div>

          <AnimatePresence>
            {expandedCandidate && (
              <CandidateDetailModal
                candidate={expandedCandidate}
                onClose={() => setExpandedCandidate(null)}
                t={t}
              />
            )}
          </AnimatePresence>

          <div className="mt-20 flex flex-col items-center">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <button
                disabled={!selected}
                onClick={() => setStep(2)}
                className="bg-slate-900 text-white px-16 py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter flex items-center gap-4 group"
              >
                {t("review_choice")}
                <ChevronRight
                  size={28}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>

              {checkPerm(role, "MANAGE_ELECTION") && (
                <button
                  onClick={handleForceFinalize}
                  disabled={submitting}
                  className="px-10 py-5 bg-red-50 text-red-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all flex items-center gap-3 shadow-sm"
                >
                  <AlertCircle size={18} />
                  {t("emergency_finalize")}
                </button>
              )}
            </div>
            <div className="mt-10 flex items-center gap-4 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100">
              <ShieldCheck size={14} />
              {t("privacy_notice_short")}
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <ShieldCheck size={14} className="text-slate-900" />
                {t("integrity_check_active")}
              </div>
              <h3 className="text-4xl font-display font-black tracking-tighter text-slate-900 leading-none uppercase">
                {t("review_choice")}
              </h3>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 h-1.5 rounded-full transition-all duration-500",
                    i === step + 1 ? "bg-slate-900 w-20" : "bg-slate-200",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="bg-white p-16 lg:p-20 rounded-[4rem] shadow-2xl text-center border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />

            <h2 className="text-4xl lg:text-5xl font-display font-black mb-6 tracking-tighter text-slate-900 uppercase">
              {t("step_3_title")}
            </h2>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mb-12 max-w-sm mx-auto">
              {t("step_3_desc")}
            </p>

            <div className="p-12 bg-slate-900 text-white rounded-[3rem] mb-12 shadow-2xl shadow-slate-300 border border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-6xl mb-6 bg-white/10 w-24 h-24 flex items-center justify-center rounded-[2rem] border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                  {candidates.find((c) => c.id === selected)?.symbol}
                </div>
                <div className="text-3xl font-display font-black tracking-tighter uppercase mb-2">
                  {candidates.find((c) => c.id === selected)?.name}
                </div>
                <div className="text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">
                  {candidates.find((c) => c.id === selected)?.party}
                </div>
              </div>
              <Fingerprint
                size={200}
                className="absolute -right-16 -bottom-16 opacity-5"
              />
            </div>

            <div className="bg-red-50 p-6 rounded-3xl mb-12 flex items-start gap-4 text-left border border-red-100">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest leading-relaxed">
                {t("inst_2")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCastVote}
                disabled={submitting}
                className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {submitting && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? t("registering_ballot") : t("confirm_anchoring")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto text-center p-16 lg:p-20 bg-white rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />

          <div className="w-28 h-28 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-100 animate-in zoom-in spin-in-6 duration-700">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-black mb-6 tracking-tighter text-slate-900 uppercase">
            {t("vote_success")}
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mb-14 max-w-sm mx-auto leading-relaxed">
            {t("vote_success_desc")}
          </p>

          <button
            onClick={() => setView("voter-hub")}
            className="bg-slate-900 text-white w-full py-8 rounded-[2.5rem] font-black text-xl uppercase tracking-tighter shadow-2xl shadow-slate-300 hover:bg-slate-800 active:scale-95 transition-all"
          >
            {t("return_terminal")}
          </button>

          <div className="mt-16 p-8 bg-slate-50 rounded-3xl font-mono text-[10px] text-slate-400 text-left border border-slate-100 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <div className="font-black text-slate-900 uppercase tracking-widest">
                {t("receipt_hash")} (SHA-256)
              </div>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <div className="break-all opacity-60 font-medium leading-relaxed group-hover:opacity-100 transition-opacity">
              NEHS—TX—
              {Math.random().toString(36).substring(2, 15).toUpperCase()}—
              {Date.now()}—ANCHORED—BLOCK—{Math.floor(Math.random() * 100000)}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// --- View: Dashboard ---
function DashboardView({
  results,
  role,
  setView,
  t,
  user,
  electionPhase,
  setElectionPhase,
  token,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  const [displayMode, setDisplayMode] = useState<
    "national" | "regional" | "district"
  >(
    user?.role === "DISTRICT_ADMIN"
      ? "district"
      : user?.role === "REGIONAL_ADMIN"
        ? "regional"
        : "national",
  );
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    getUserRegionId(user),
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
    getUserDistrictId(user),
  );
  const [updatingPhase, setUpdatingPhase] = useState(false);

  const updatePhase = async (newPhase: string) => {
    setUpdatingPhase(true);
    try {
      const resp = await fetch("/api/election/phase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phase: newPhase }),
      });
      const data = await resp.json();
      if (data.success) {
        setElectionPhase(data.phase);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingPhase(false);
    }
  };

  if (!results)
    return (
      <div className="text-center py-20 animate-pulse">
        {t("initializing_data")}
      </div>
    );

  const getResultsToDisplay = () => {
    const targetRegion =
      user?.role === "REGIONAL_ADMIN" || user?.role === "DISTRICT_ADMIN"
        ? getUserRegionId(user)
        : selectedRegion;

    const targetDistrict =
      user?.role === "DISTRICT_ADMIN"
        ? getUserDistrictId(user)
        : selectedDistrict;

    if (displayMode === "national" || !targetRegion) {
      return {
        total: results.total,
        counts: results.counts,
      };
    }

    const region = results.regional?.find((r: any) => r.id === targetRegion);
    if (!region) return { total: 0, counts: [] };

    if (displayMode === "district" && targetDistrict) {
      const district = region.districts?.find(
        (d: any) => d.id === targetDistrict,
      );
      if (district) {
        const districtCounts = results.counts.map((c: any) => {
          const districtCandidate = district.candidates.find(
            (dc: any) => dc.id === c.id,
          );
          return {
            ...c,
            votes: districtCandidate ? districtCandidate.votes : 0,
          };
        });
        return {
          total: district.total,
          counts: districtCounts,
        };
      }
    }

    // Map regional candidate votes to the full candidate objects
    const regionCounts = results.counts.map((c: any) => {
      const regionCandidate = region.candidates.find(
        (rc: any) => rc.id === c.id,
      );
      return {
        ...c,
        votes: regionCandidate ? regionCandidate.votes : 0,
      };
    });

    return {
      total: region.total,
      counts: regionCounts,
    };
  };

  const currentResults = getResultsToDisplay();
  const winner = [...currentResults.counts].sort(
    (a, b) => b.votes - a.votes,
  )[0];

  const getDisplayTitle = () => {
    if (displayMode === "national") return t("national_results");
    if (displayMode === "regional")
      return selectedRegion ? t(selectedRegion) : t("regional_breakdown");
    if (displayMode === "district")
      return selectedDistrict
        ? `${t(selectedRegion || "")} - ${selectedDistrict}`
        : t("district_results");
    return t("dashboard");
  };

  const displayTitle = getDisplayTitle();

  const canManage =
    checkPerm(role, "VIEW_VOTERS") || checkPerm(role, "MANAGE_ELECTION");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg">
              <LayoutDashboard size={24} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900">
              {displayTitle}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-slate-400 font-medium flex items-center gap-2 text-xs uppercase tracking-widest">
              <Clock size={14} /> {t("live_stream")}
            </p>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("active_monitoring")}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>

          <div className="w-px h-10 bg-slate-100" />

          {role === "ADMIN" && (
            <button
              onClick={() => setDisplayMode("national")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                displayMode === "national"
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
              )}
            >
              {t("national")}
            </button>
          )}
          {role !== "DISTRICT_ADMIN" && (
            <button
              onClick={() => {
                setDisplayMode("regional");
                if (!selectedRegion && results.regional?.length) {
                  setSelectedRegion(results.regional[0].id);
                }
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                displayMode === "regional"
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
              )}
            >
              {t("regional")}
            </button>
          )}
          {(role === "ADMIN" ||
            role === "REGIONAL_ADMIN" ||
            role === "DISTRICT_ADMIN") && (
            <button
              onClick={() => {
                setDisplayMode("district");
                if (!selectedRegion && results.regional?.length) {
                  setSelectedRegion(results.regional[0].id);
                }
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                displayMode === "district"
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
              )}
            >
              {t("district")}
            </button>
          )}
          {scopeAccess.role !== "ADMIN" && (
            <div className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100">
              {scopeAccess.summaryLabel}
            </div>
          )}
          <button
            onClick={() => setView("history")}
            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            {t("archive")}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {displayMode === "regional" && scopeAccess.canPickRegion && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            className="mb-12 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
              {results.regional?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(r.id)}
                  className={cn(
                    "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedRegion === r.id
                      ? "bg-white text-slate-900 shadow-xl shadow-slate-200 border border-slate-100"
                      : "text-slate-400 hover:text-slate-600 hover:bg-white/50",
                  )}
                >
                  {t(r.id)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {displayMode === "district" && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            className="mb-12 overflow-hidden space-y-4"
          >
            {scopeAccess.canPickRegion && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
                {results.regional?.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRegion(r.id);
                      if (r.districts?.length)
                        setSelectedDistrict(r.districts[0].id);
                    }}
                    className={cn(
                      "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                      selectedRegion === r.id
                        ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                        : "text-slate-400 hover:text-slate-600 hover:bg-white/50",
                    )}
                  >
                    {t(r.id)}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
              <div className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {t("district_selection")}:
              </div>
              {results.regional
                ?.find((r: any) => r.id === selectedRegion)
                ?.districts?.map((d: any) => (
                  <button
                    key={d.id}
                    disabled={
                      scopeAccess.isDistrictLocked &&
                      d.id !== getUserDistrictId(user)
                    }
                    onClick={() => setSelectedDistrict(d.id)}
                    className={cn(
                      "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                      selectedDistrict === d.id
                        ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-inner"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30",
                    )}
                  >
                    {d.name}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(role === "REGIONAL_ADMIN" || role === "DISTRICT_ADMIN") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div className="p-10 lg:p-14 bg-white border border-slate-100 rounded-[4rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-30 group-hover:opacity-60 transition-opacity" />

            <div className="space-y-4 relative z-10">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-900" />
                {role === "REGIONAL_ADMIN"
                  ? t("role_regional_admin")
                  : t("role_district_admin")}{" "}
                {t("active_session")}
              </h2>
              <h3 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
                {t("governance_terminal")}
              </h3>
              <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-2xl uppercase tracking-widest">
                {role === "REGIONAL_ADMIN"
                  ? "Integrated regional dashboard for oversight of voter registration integrity, station performance, and district synchronization protocols."
                  : "Localized precinct terminal for real-time voter flow management, staff coordination, and cryptographic ballot verification."}
              </p>

              <div className="flex flex-wrap gap-4 pt-6">
                <button
                  onClick={() => setView("voters")}
                  className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all flex items-center gap-3 shadow-2xl shadow-slate-200 active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  {t("voter_registry")}
                </button>
                <button className="px-8 py-4 bg-white border border-slate-100 text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm active:scale-95">
                  <Activity className="w-4 h-4" />
                  {t("audit_protocols")}
                </button>
              </div>
            </div>
          </div>

          <div className="p-10 lg:p-14 bg-slate-50 border border-slate-100 rounded-[4rem] relative overflow-hidden group">
            <div className="space-y-6 relative z-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                {role === "REGIONAL_ADMIN"
                  ? t("regional_performance")
                  : t("district_pulse")}
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">
                    {t("stations_active")}
                  </p>
                  <p className="text-2xl font-display font-black text-slate-900">
                    142 / 142
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">
                    {t("sync_latency")}
                  </p>
                  <p className="text-2xl font-display font-black text-emerald-500">
                    Optimum
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">
                    {t("staff_on_duty")}
                  </p>
                  <p className="text-2xl font-display font-black text-slate-900">
                    842
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">
                    {t("integrity_alerts")}
                  </p>
                  <p className="text-2xl font-display font-black text-slate-400">
                    0
                  </p>
                </div>
              </div>
            </div>
            <Activity
              size={100}
              className="absolute -right-8 -bottom-8 text-slate-200"
            />
          </div>
        </motion.div>
      )}

      {checkPerm(role, "MANAGE_ELECTION") && (
        <div className="mb-16 p-10 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                {t("admin_master_control")}
              </h4>
              <p className="text-2xl font-display font-black tracking-tight">
                {t("election_phase_management")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {["REGISTRATION", "VOTING", "CLOSED"].map((p) => (
                <button
                  key={p}
                  disabled={updatingPhase || electionPhase === p}
                  onClick={() => updatePhase(p)}
                  className={cn(
                    "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    electionPhase === p
                      ? "bg-white text-slate-900 shadow-xl shadow-slate-800"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {t(p)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard
          title={t("certified_ballots")}
          value={currentResults.total.toLocaleString()}
          sub={t("live_tally_synced")}
          icon={<Users className="text-slate-900" />}
        />
        <StatCard
          title={t("voter_participation")}
          value={
            displayMode === "national"
              ? "84.2%"
              : `${(Math.random() * 20 + 70).toFixed(1)}%`
          }
          sub={t("technical_uptime")}
          icon={<Database className="text-slate-900" />}
        />
        <StatCard
          title={t("integrity_score")}
          value="99.99"
          sub={t("audit_verified")}
          icon={<ShieldCheck className="text-slate-900" />}
        />
        <StatCard
          title={t("leading_party")}
          value={winner.votes > 0 ? t(winner.id + "_name") : "—"}
          sub={winner.votes > 0 ? t(winner.id + "_party") : t("awaiting_data")}
          icon={
            winner.photoUrl && winner.votes > 0 ? (
              <img
                src={winner.photoUrl}
                alt={winner.name}
                className="w-8 h-8 rounded-[0.75rem] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCheck className="text-slate-900" />
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <div className="bg-white rounded-[4rem] p-12 lg:p-16 border border-slate-100 shadow-sm relative overflow-hidden group">
            {/* BG Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-16 relative z-10">
              <div>
                <h3 className="text-3xl lg:text-4xl font-display font-black text-slate-900 tracking-tighter uppercase mb-2">
                  {t("live_analytics")}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  {t("real_time_broadcasting")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {t("total_counted")}
                  </p>
                  <p className="text-xl font-display font-black text-slate-900">
                    {currentResults.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-12 relative z-10">
              {currentResults.counts.map((c: Candidate) => {
                const percentage =
                  currentResults.total > 0
                    ? (c.votes / currentResults.total) * 100
                    : 0;
                return (
                  <div key={c.id} className="space-y-4 group/item">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-5">
                        <div className="relative w-14 h-14 shrink-0 transition-transform group-hover/item:scale-110">
                          {c.photoUrl ? (
                            <img
                              src={c.photoUrl}
                              alt={c.name}
                              className="w-full h-full object-cover rounded-2xl border border-slate-100 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-3xl bg-slate-50 w-full h-full rounded-2xl flex items-center justify-center border border-slate-100 font-display font-black">
                              {c.symbol}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm text-[10px] font-black border border-slate-50">
                            {c.symbol}
                          </div>
                        </div>
                        <div>
                          <span className="font-display font-black text-xl text-slate-900 tracking-tighter uppercase block leading-none mb-1">
                            {t(c.id + "_name")}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">
                            {t(c.id + "_party")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display font-black text-3xl text-slate-900 tracking-tighter leading-none">
                          {percentage.toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                          {c.votes.toLocaleString()} {t("verified_votes")}
                        </p>
                      </div>
                    </div>
                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          winner.votes > 0 && c.id === winner.id
                            ? "bg-slate-900 shadow-lg shadow-slate-100"
                            : "bg-slate-200",
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {canManage && (
            <div className="bg-white rounded-[4rem] p-12 lg:p-16 border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-12 flex items-center gap-3">
                <ShieldCheck size={20} className="text-slate-300" />
                {t("governance_nexus")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {checkPerm(role, "VIEW_VOTERS") && (
                  <button
                    onClick={() => setView("voters")}
                    className="p-10 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[3rem] border border-slate-100 transition-all duration-500 text-left group/nexus"
                  >
                    <div className="bg-white group-hover/nexus:bg-white/10 p-5 rounded-2xl w-fit mb-8 shadow-sm transition-colors">
                      <Users
                        size={32}
                        className="text-slate-900 group-hover/nexus:text-white transition-colors"
                      />
                    </div>
                    <h4 className="font-display font-black text-2xl uppercase tracking-tighter mb-2">
                      {t("citizen_registry")}
                    </h4>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40">
                      {t("manage_verified_voters")}
                    </p>
                  </button>
                )}
                {checkPerm(role, "MANAGE_USERS") && (
                  <button
                    onClick={() => setView("users")}
                    className="p-10 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[3rem] border border-slate-100 transition-all duration-500 text-left group/nexus"
                  >
                    <div className="bg-white group-hover/nexus:bg-white/10 p-5 rounded-2xl w-fit mb-8 shadow-sm transition-colors">
                      <Lock
                        size={32}
                        className="text-slate-900 group-hover/nexus:text-white transition-colors"
                      />
                    </div>
                    <h4 className="font-display font-black text-2xl uppercase tracking-tighter mb-2">
                      {t("access_matrix")}
                    </h4>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40">
                      {t("role_permissions_management")}
                    </p>
                  </button>
                )}
              </div>

              <div className="mt-12 p-10 bg-slate-900 text-white rounded-[3.5rem] relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h4 className="font-display font-black text-3xl uppercase tracking-tighter mb-2">
                      {t("system_auditing")}
                    </h4>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40">
                      {t("cryptographic_event_ledger")}
                    </p>
                  </div>
                  <button
                    onClick={() => setView("audit-logs")}
                    className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/50"
                  >
                    {t("view_audit_reports")}
                  </button>
                </div>
                <Activity
                  className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity"
                  size={240}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-12">
          {(role === "ADMIN" || role === "OBSERVER") && (
            <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
              <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-10 relative z-10">
                {t("active_ledger")}
              </h3>
              <div className="space-y-6 relative z-10">
                <LogItem time={t("just_now")} event={t("log_tally_update")} />
                <LogItem
                  time={t("time_ago", { n: 2 })}
                  event={`4,200 ${t("shard_synced")} (Jimma)`}
                />
                <LogItem
                  time={t("time_ago", { n: 5 })}
                  event={t("log_mix_anchored")}
                />
                <LogItem
                  time={t("time_ago", { n: 12 })}
                  event={`${t("log_integrity_check")} [PASSED]`}
                />
              </div>
              <Activity
                className="absolute -left-12 -bottom-12 opacity-[0.03]"
                size={280}
              />
            </div>
          )}

          <div className="bg-white border border-slate-100 p-12 rounded-[4rem] shadow-sm transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-500" />
                {t("integrity_engine")}
              </h4>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider mb-10">
              {t("integrity_engine_desc")}
            </p>
            <button className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              {t("full_transparency_report")}
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem]">
            <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <BarChart3 size={18} className="text-emerald-600" />
              {t("network_pulse")}
            </h4>
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">
                  {t("nodes_online")}
                </span>
                <span className="font-display font-black text-xl text-emerald-900">
                  4,120
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">
                  {t("avg_sync")}
                </span>
                <span className="font-display font-black text-xl text-emerald-900">
                  42ms
                </span>
              </div>
              <div className="pt-6 border-t border-emerald-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    {t("status")}
                  </span>
                  <span className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em]">
                    {t("optimal")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AuditLogsView({ setView, token, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/admin/audit-logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setLogs(data.reverse()); // Show latest first
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-16">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> {t("back_to_dashboard")}
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase leading-none">
            {t("cryptographic_ledger")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("audit_ledger_desc")}
          </p>
        </div>

        <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-6 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all border border-transparent"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("live_sync_active")}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden font-mono text-[10px] relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={200} />
        </div>

        {loading ? (
          <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("decrypting_logs")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-32 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("no_audit_events")}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 relative z-10">
            {logs.map((log, i) => (
              <div
                key={i}
                className="p-8 flex flex-col md:flex-row items-start gap-8 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="shrink-0 w-44 text-slate-300 font-black uppercase tracking-tighter group-hover:text-slate-500 transition-colors">
                  {new Date(log.timestamp || log.time).toLocaleString()}
                </div>
                <div className="grow">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={cn(
                        "font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1.5 rounded-lg shadow-sm",
                        log.event.includes("SUCCESS") ||
                          log.event === "VOTER_REGISTERED"
                          ? "bg-emerald-500 text-white"
                          : log.event.includes("FAILED") ||
                              log.event.includes("LOCKED")
                            ? "bg-rose-500 text-white"
                            : "bg-slate-900 text-white font-mono",
                      )}
                    >
                      {log.event}
                    </span>
                    <div className="h-px w-8 bg-slate-100" />
                    <span className="text-slate-300 font-black opacity-40">
                      #{100000 + (logs.length - i)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    {Object.entries(log)
                      .filter(
                        ([k]) =>
                          k !== "event" && k !== "timestamp" && k !== "time",
                      )
                      .map(([k, v]: [any, any]) => (
                        <div key={k} className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {k}
                          </span>
                          <span
                            className="text-slate-900 font-black truncate block text-xs"
                            title={String(v)}
                          >
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VoterRegistryView({ setView, token, t, i18n, user }: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await fetch("/api/admin/voters", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setVoters(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVoters();
  }, [token]);

  const filteredVoters = voters.filter(
    (v) =>
      v.fullName.toLowerCase().includes(search.toLowerCase()) ||
      v.nationalId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20"
    >
      <div className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> {t("back_to_dashboard")}
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase leading-none">
            {t("citizen_registry")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("voter_registry_desc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {scopeAccess.role !== "ADMIN" && (
            <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100">
              {scopeAccess.summaryLabel}
            </div>
          )}
          <div className="relative group flex-1 min-w-[300px]">
            <Search
              size={18}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors"
            />
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-16 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] w-full outline-none focus:ring-4 focus:ring-slate-50 focus:border-slate-300 transition-all shadow-sm font-medium text-slate-900"
            />
          </div>
          <div className="flex gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
            <button
              onClick={() =>
                i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
              }
              className="px-6 py-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all"
            >
              {lang === "en" ? "አማርኛ" : "English"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
        {loading ? (
          <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("fetching_registry")}
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="p-32 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] font-black">
            {t("no_voters_found")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] tracking-[0.3em] text-slate-400 font-black">
                  <th className="px-10 py-6">{t("full_name_label")}</th>
                  <th className="px-10 py-6">{t("national_id_label")}</th>
                  <th className="px-10 py-6">{t("region")}</th>
                  <th className="px-10 py-6">{t("biometric_token_label")}</th>
                  <th className="px-10 py-6 text-center">
                    {t("status_label_table")}
                  </th>
                  <th className="px-10 py-6 text-right">
                    {t("actions_label")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVoters.map((voter: any) => (
                  <tr
                    key={voter.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-10 py-6 font-display">
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tighter leading-none mb-1 group-hover:translate-x-1 transition-transform">
                        {voter.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {voter.email}
                      </p>
                    </td>
                    <td className="px-10 py-6">
                      <span className="font-mono text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm font-black">
                        {voter.nationalId}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {t(voter.regionId)}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span
                        className="text-[10px] text-slate-300 font-mono uppercase tracking-tighter truncate max-w-[120px] block group-hover:text-slate-900 transition-colors"
                        title={voter.biometricHash}
                      >
                        {voter.biometricHash.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-2 w-fit mx-auto",
                          voter.hasVoted
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-slate-50 text-slate-400 border border-slate-100",
                        )}
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            voter.hasVoted
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-200",
                          )}
                        />
                        {voter.hasVoted ? t("ballot_cast") : t("awaiting_vote")}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button className="p-3 bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:opacity-100 transition-opacity opacity-0" />
        <div className="relative z-10">
          <p className="text-5xl font-display font-black tracking-tighter leading-none mb-2">
            {voters.length.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">
            {t("total_registered_citizens")}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10 mt-8 md:mt-0">
          <button className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-500" />
            {t("integrity_check")}
          </button>
          <button className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-900 group-hover:bg-slate-100 transition-all flex items-center gap-3">
            <Download size={18} />
            {t("export_registry")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryView({ setView, role, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const pastElections = [
    {
      year: "2021",
      title: t("election_6_title"),
      date: t("election_6_date"),
      turnout: "38,234,910",
      winner: "Prosperity Party",
      percentage: "92.4%",
      status: "Certified",
    },
    {
      year: "2015",
      title: t("election_5_title"),
      date: t("election_5_date"),
      turnout: "36,851,461",
      winner: "EPRDF",
      percentage: "100%",
      status: "Archived",
    },
    {
      year: "2010",
      title: t("election_4_title"),
      date: t("election_4_date"),
      turnout: "29,832,190",
      winner: "EPRDF",
      percentage: "99.2%",
      status: "Archived",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Clock size={14} className="text-slate-900" />
            {t("historical_archive_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("democracy_history")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-wide">
            {t("historical_records_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
          >
            {lang === "en" ? "Amharic (አማርኛ)" : "English"}
          </button>
          <button
            onClick={() =>
              setView(
                role === "NONE"
                  ? "login"
                  : role === "VOTER"
                    ? "voter-hub"
                    : "dashboard",
              )
            }
            className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all"
          >
            {t("return_portal")}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {pastElections.map((election, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative overflow-hidden group hover:shadow-2xl transition-all duration-700"
          >
            <div className="flex items-center gap-10 relative z-10">
              <div className="bg-slate-900 text-white w-28 h-28 rounded-[2.5rem] flex flex-col items-center justify-center border-4 border-slate-800 shadow-xl group-hover:scale-105 transition-transform duration-500">
                <span className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">
                  {t("year")}
                </span>
                <span className="text-4xl font-display font-black leading-none tracking-tighter">
                  {election.year}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {election.title}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  <Clock size={14} />
                  {election.date}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 relative z-10 lg:pl-12 lg:border-l border-slate-50">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("voter_turnout")}
                </p>
                <p className="text-2xl font-display font-black text-slate-900 tracking-tighter">
                  {election.turnout}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("winning_party")}
                </p>
                <p className="text-2xl font-display font-black text-slate-900 tracking-tighter group-hover:text-slate-700 transition-colors">
                  {election.winner}
                </p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  {election.percentage} {t("valid_votes_short")}
                </p>
              </div>
              <div className="hidden lg:block space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("status_label")}
                </p>
                <span
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2",
                    election.status === "Certified"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-slate-50 text-slate-400 border border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      election.status === "Certified"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-200",
                    )}
                  />
                  {election.status}
                </span>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-slate-50/50 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-end px-12">
              <button className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all">
                <FileCheck size={24} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:opacity-100 transition-opacity opacity-0" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-4 text-center lg:text-left">
            <h3 className="text-4xl font-display font-black tracking-tighter uppercase leading-none">
              {t("registry_verification")}
            </h3>
            <p className="text-sm opacity-50 font-medium leading-relaxed uppercase tracking-widest">
              {t("historical_verifiability_desc")}
            </p>
          </div>
          <button className="bg-white text-slate-900 px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-100 active:scale-95 transition-all shadow-xl shadow-slate-900 flex items-center gap-3">
            {t("access_public_api")}
            <ChevronRight size={18} />
          </button>
        </div>
        <Database
          className="absolute -right-16 -bottom-16 opacity-5"
          size={300}
        />
      </div>
    </motion.div>
  );
}

function HelpView({ setView, role, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const faqs = [
    {
      q: t("faq_q1", { defaultValue: "What is the NEHS Platform?" }),
      a: t("faq_a1", {
        defaultValue:
          "The National Election Hub System (NEHS) is Ethiopia's state-of-the-art electronic voting platform designed to ensure transparent, secure, and accessible democratic participation.",
      }),
    },
    {
      q: t("faq_q2", {
        defaultValue: "How does the biometric verification work?",
      }),
      a: t("faq_a2", {
        defaultValue:
          "We use SHA-256 cryptographic hashing to turn your physical fingerprint or facial features into a unique digital string. Your actual biometric image is never stored, ensuring your privacy is protected even in the event of a breach.",
      }),
    },
    {
      q: t("faq_q3", { defaultValue: "Is my vote anonymous?" }),
      a: t("faq_a3", {
        defaultValue:
          "Yes. NEHS uses a multi-layered encryption protocol (Mix-nets). Your vote is decoupled from your identity using cryptographic shuffling before it is added to the public ledger, making it mathematically impossible to link a specific ballot back to a voter.",
      }),
    },
    {
      q: t("faq_q4", { defaultValue: "What is the 'Receipt Hash'?" }),
      a: t("faq_a4", {
        defaultValue:
          "After voting, you receive a unique transaction hash. This hash allows you to independently verify that your ballot was included in the final tally without revealing who you voted for.",
      }),
    },
    {
      q: t("faq_q5", { defaultValue: "How can I register to vote?" }),
      a: t("faq_a5", {
        defaultValue:
          "You can start the pre-registration process online by visiting the registration portal. You'll then need to visit a local election center once to capture your biometric data for identity verification.",
      }),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("support_terminal_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("help_support")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("understanding_infra")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
          >
            {lang === "en" ? "Amharic (አማርኛ)" : "English"}
          </button>
          <button
            onClick={() =>
              setView(
                role === "NONE"
                  ? "login"
                  : role === "VOTER"
                    ? "voter-hub"
                    : "dashboard",
              )
            }
            className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] hover:underline transition-all"
          >
            {t("return_portal")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <Activity className="text-slate-900" size={28} />
              {t("faq")}
            </h3>
            <div className="space-y-12 relative z-10">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border-b border-slate-100 pb-10 last:border-0 last:pb-0 hover:translate-x-1 transition-transform group-faq"
                >
                  <h4 className="font-display font-black text-xl text-slate-900 mb-4 uppercase tracking-[0.02em]">
                    {faq.q}
                  </h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <ShieldCheck className="text-emerald-500" size={28} />
              {t("security_whitepaper")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">
                  {t("data_at_rest")}
                </p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-widest">
                  {t("data_at_rest_desc")}
                </p>
              </div>
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">
                  {t("in_flight_verifiability")}
                </p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-widest">
                  {t("in_flight_verifiability_desc")}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-2xl font-display font-black mb-6 uppercase tracking-tighter leading-none relative z-10">
              {t("need_support")}
            </h3>
            <p className="text-[10px] text-white/50 mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed relative z-10">
              {t("support_desc_v2")}
            </p>
            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner relative z-10 group-hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase opacity-40 font-black mb-2 tracking-[0.3em]">
                {t("priority_hotline")}
              </p>
              <p className="text-5xl font-display font-black tracking-tighter text-white">
                8800
              </p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <h4 className="text-[10px] font-black text-slate-900 mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              {t("platform_stats")}
            </h4>
            <div className="space-y-6 mb-12">
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("system_uptime")}
                </span>
                <span className="text-[10px] font-mono text-emerald-500 font-black uppercase">
                  {t("uptime_val")}
                </span>
              </div>
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("encryption_layer")}
                </span>
                <span className="text-[10px] font-mono text-slate-900 font-black uppercase">
                  {t("tls_pgp")}
                </span>
              </div>
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("ledger_type")}
                </span>
                <span className="text-[10px] font-mono text-slate-900 font-black uppercase">
                  {t("permissioned")}
                </span>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <h4 className="font-black text-[9px] mb-8 uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
                <Shield size={12} className="text-slate-900" />
                {t("tech_stack_verified")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Frontend",
                    val: "React 18",
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Database",
                    val: "Node 20",
                    color: "bg-slate-900 text-white",
                  },
                  {
                    label: "Security",
                    val: "AES-256",
                    color: "bg-indigo-50 text-indigo-600",
                  },
                  {
                    label: "Network",
                    val: "gRPC/TLS",
                    color: "bg-rose-50 text-rose-600",
                  },
                ].map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-md inline-block",
                        stat.color,
                      )}
                    >
                      {stat.label}
                    </span>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-32 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] pt-12 border-t border-slate-50 italic">
        {t("unauthorized_access_prohibited")}
      </div>
    </motion.div>
  );
}

function UserManagementView({ setView, token, t, i18n, user }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "STAFF",
    regionId: "",
    districtId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url =
        modalMode === "create"
          ? "/api/admin/users"
          : `/api/admin/users/${editingUser.id}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete_user"))) return;
    try {
      const resp = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      role: "STAFF",
      regionId: "",
      districtId: "",
    });
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setModalMode("edit");
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      regionId: user.regionId || "",
      districtId: user.districtId || "",
    });
    setShowModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("identity_management_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("user_administration")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("user_admin_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <button
            onClick={openCreateModal}
            className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <UserPlus size={18} />
            {t("add_authorized_user")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
          {t("fetching_users")}
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] tracking-[0.3em] text-slate-400 font-black">
                <th className="px-10 py-6">{t("username")}</th>
                <th className="px-10 py-6">{t("role")}</th>
                <th className="px-10 py-6">{t("jurisdiction")}</th>
                <th className="px-10 py-6">{t("system_status")}</th>
                <th className="px-10 py-6 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-10 py-6">
                    <p className="font-display font-black text-slate-900 text-lg uppercase tracking-tighter leading-none group-hover:translate-x-1 transition-transform">
                      {u.username}
                    </p>
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">
                      UUID: {u.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-10 py-6">
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 uppercase font-black tracking-widest shadow-sm">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        {u.regionId || "GLOBAL"}
                      </p>
                      {u.districtId && (
                        <p className="text-[9px] text-slate-400 font-black uppercase">
                          District: {u.districtId}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit",
                        u.lockUntil && new Date(u.lockUntil) > new Date()
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          u.lockUntil && new Date(u.lockUntil) > new Date()
                            ? "bg-rose-500"
                            : "bg-emerald-500 animate-pulse",
                        )}
                      />
                      {u.lockUntil && new Date(u.lockUntil) > new Date()
                        ? t("terminal_locked")
                        : t("authorized")}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right space-x-3">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-3 bg-rose-50 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-[100] animate-in fade-in duration-300">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] p-12 lg:p-16 w-full max-w-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <UserPlus size={160} />
            </div>

            <h3 className="font-display font-black text-4xl mb-4 tracking-tighter text-slate-900 uppercase">
              {modalMode === "create"
                ? t("authorized_onboarding")
                : t("identity_reconfiguration")}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12">
              {t("security_protocol_req")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("unique_identifier")}
                </label>
                <input
                  required
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("vulnerability_passkey")}{" "}
                  {modalMode === "edit" && (
                    <span className="opacity-40 italic">
                      ({t("leave_blank_keep")})
                    </span>
                  )}
                </label>
                <input
                  required={modalMode === "create"}
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("assigned_clearance")}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                >
                  <option value="STAFF">Staff (Voter View Only)</option>
                  <option value="OBSERVER">Observer (Full Read)</option>
                  <option value="DISTRICT_ADMIN">District Administrator</option>
                  <option value="REGIONAL_ADMIN">Regional Administrator</option>
                  <option value="ADMIN">System Architect</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  {t("terminate_op")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  {submitting
                    ? t("registering_identity")
                    : t("commit_anchoring")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function ResultsDashboardView({ setView, token, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/overview", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        const overview = payload?.data;
        setResults({
          electionId: overview?.election?.id,
          total: overview?.totalBallots ?? 0,
          counts:
            overview?.candidateStandings?.map((candidate: any) => ({
              id: candidate.candidateId,
              displayName: candidate.fullName,
              party: candidate.party,
              votes: candidate.votes,
            })) ?? [],
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch results:", err);
        setResults({ total: 0, counts: [] });
        setLoading(false);
      });
  }, [token]);

  if (loading)
    return (
      <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
        {t("fetching_live_tally")}
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto pb-20 space-y-12"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("live_audit_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("election_results")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("results_live_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("verified_tally")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          title={t("total_ballots_anchored")}
          value={results.total.toLocaleString()}
          sub={t("cryptographically_verified")}
          icon={<Users size={24} />}
        />
        <StatCard
          title={t("estimated_turnout")}
          value={`${((results.total / 1000) * 100).toFixed(1)}%`}
          sub={t("real_time_calc")}
          icon={<PieChart size={24} />}
        />

        <button
          onClick={async () => {
            try {
              const electionQuery = results?.electionId
                ? `?electionId=${encodeURIComponent(results.electionId)}`
                : "";
              const response = await fetch(`/api/reports/export/csv${electionQuery}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok) throw new Error("Failed to export");
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nehs_results_${Date.now()}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e) {
              console.error(e);
              alert("Error exporting CSV");
            }
          }}
          className="lg:col-span-2 bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl hover:bg-slate-800 transition-all group relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Download size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <span className="font-display font-black text-3xl tracking-tighter uppercase leading-none block">
              {t("export_full_dataset")}
            </span>
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block">
              {t("export_compliance_ready")}
            </span>
          </div>
          <div className="mt-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 px-4 py-2 rounded-xl">
              {t("format_csv_json")}
            </span>
          </div>
        </button>
      </div>

      <div className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BarChart3 size={160} />
        </div>
        <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
          <BarChart3 className="text-slate-900" size={28} />
          {t("candidate_standings")}
        </h3>
        <div className="space-y-10 relative z-10">
          {results.counts.map((c: any) => (
            <div key={c.id} className="space-y-4 group/bar">
              <div className="flex justify-between items-end mb-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">
                    {c.party}
                  </span>
                  <span className="text-xl font-display font-black text-slate-900 uppercase tracking-tighter group-hover/bar:translate-x-1 transition-transform inline-block">
                    {c.displayName}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-2xl font-display font-black text-slate-900 tabular-nums">
                    {c.votes.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">
                    {results.total > 0
                      ? `${((c.votes / results.total) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-50 h-4 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${results.total > 0 ? (c.votes / results.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="bg-slate-900 h-full rounded-full shadow-lg relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20 p-12 bg-emerald-50 rounded-[3.5rem] border border-emerald-100 text-emerald-900/60 font-mono text-[10px] uppercase tracking-widest text-center">
        {t("results_cryptographically_signed_by_nehs")}
      </div>
    </motion.div>
  );
}
