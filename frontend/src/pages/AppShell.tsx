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
  Boxes,
} from "lucide-react";
import { CandidateDetailModal } from "../components/candidates/CandidateDetailModal";
import { GeographyManagementView } from "../components/admin/GeographyManagementView";
import { MfaSecurityView } from "../components/admin/MfaSecurityView";
import { PasswordResetView } from "../components/auth/PasswordResetView";
import { SessionManagementView } from "../components/admin/SessionManagementView";
import { ObserverEvidenceView } from "../components/observer/ObserverEvidenceView";
import { ElectionManagementView } from "../components/admin/ElectionManagementView";
import { CandidateManagementView } from "../components/admin/CandidateManagementView";
import { LoginView } from "../components/auth/LoginView";
import { RegistrationView } from "../components/auth/RegistrationView";
import { VoterHub } from "../components/voter/VoterHub";
import { VotingBoothView } from "../components/voter/VotingBoothView";
import { DashboardView } from "../components/admin/DashboardView";
import { VoterRegistryView } from "../components/admin/VoterRegistryView";
import { AuditLogsView } from "../components/admin/AuditLogsView";
import { HistoryView } from "../components/common/HistoryView";
import { HelpView } from "../components/common/HelpView";
import { UserManagementView } from "../components/admin/UserManagementView";
import { ResultsDashboardView } from "../components/admin/ResultsDashboardView";
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

            {checkPerm(role, "MANAGE_ELECTION") && (
              <button
                onClick={() => setView("elections")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "elections"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Boxes size={18} />
                <span className="text-sm tracking-tight">
                  {lang === "en" ? "Elections" : "ምርጫዎች"}
                </span>
              </button>
            )}

            {checkPerm(role, "MANAGE_ELECTION") && (
              <button
                onClick={() => setView("candidates")}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === "candidates"
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <Users size={18} />
                <span className="text-sm tracking-tight">
                  {lang === "en" ? "Candidates" : "ዕጩዎች"}
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
            {checkPerm(role, "MANAGE_ELECTION") && (
              <button
                onClick={() => {
                  setView("elections");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {lang === "en" ? "Elections" : "ምርጫዎች"}
              </button>
            )}
            {checkPerm(role, "MANAGE_ELECTION") && (
              <button
                onClick={() => {
                  setView("candidates");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
              >
                {lang === "en" ? "Candidates" : "ዕጩዎች"}
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
            {view === "elections" && checkPerm(role, "MANAGE_ELECTION") && (
              <ElectionManagementView
                setView={setView}
                token={token}
                user={user}
              />
            )}
            {view === "candidates" && checkPerm(role, "MANAGE_ELECTION") && (
              <CandidateManagementView
                setView={setView}
                token={token}
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
