import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
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
  History,
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
import { ObserverEvidenceView } from "../components/observer/ObserverEvidenceView";
import { ElectionManagementView } from "../components/admin/ElectionManagementView";
import AdminOpenElectionView from "../components/admin/AdminOpenElectionView";
import { CandidateManagementView } from "../components/admin/CandidateManagementView";
import { LoginView } from "../components/auth/LoginView";
import { RegistrationView } from "../components/auth/RegistrationView";
import { VoterHub } from "../components/voter/VoterHub";
import { VotingBoothView } from "../components/voter/VotingBoothView";
import { ReceiptVerificationView } from "../components/voter/ReceiptVerificationView";
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
import {
  mapStatusToPhase,
  useElectionRealtime,
} from "../hooks/useElectionRealtime";
import { fetchJson } from "../services/api/client";
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
  const [openElectionContext, setOpenElectionContext] = useState<{
    id: string | null;
    title: string | null;
    status: string | null;
  }>({ id: null, title: null, status: null });
  const [authHydrated, setAuthHydrated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const normalizePath = (pathname: string) => {
    const trimmed = pathname.replace(/\/+$/, "") || "/";

    if (trimmed.startsWith("/super-admin/")) {
      return trimmed.replace("/super-admin", "");
    }

    if (trimmed.startsWith("/admin/")) {
      return trimmed.replace("/admin", "");
    }

    return trimmed;
  };
  const isJwtAccessToken = (value: string | null) =>
    Boolean(value && value.split(".").length === 3);
  const getAdminPathPrefix = () => {
    if (role === "SUPER_ADMIN") return "/super-admin";
    if (role === "ADMIN") return "/admin";
    return "";
  };
  const viewFromPath = (pathname: string) => {
    const normalizedPath = normalizePath(pathname);

    switch (normalizedPath) {
      case "/":
      case "/login":
        return "login";
      case "/password-reset":
        return "password-reset";
      case "/help":
        return "help";
      case "/history":
        return "history";
      case "/voters":
        return "voters";
      case "/users":
        return "users";
      case "/elections":
        return "elections";
      case "/candidates":
        return "candidates";
      case "/audit-logs":
        return "audit-logs";
      case "/results-dashboard":
        return "results-dashboard";
      case "/geography":
        return "geography";
      case "/security":
        return "security";
      case "/observer-evidence":
        return "observer-evidence";
      case "/voter-hub":
        return "voter-hub";
      case "/voter-hub-admin":
        return "voter-hub-admin";
      case "/registration":
        return "registration";
      case "/voting-booth":
        return "voting-booth";
      case "/receipt-verification":
        return "receipt-verification";
      case "/dashboard":
        return "dashboard";
      default:
        return "dashboard";
    }
  };
  const pathFromView = (nextView: string) => {
    const adminPrefix = getAdminPathPrefix();
    switch (nextView) {
      case "login":
        return "/login";
      case "password-reset":
        return "/password-reset";
      case "help":
        return "/help";
      case "history":
        return "/history";
      case "voters":
        return `${adminPrefix}/voters` || "/voters";
      case "users":
        return adminPrefix ? `${adminPrefix}/users` : "/users";
      case "elections":
        return adminPrefix ? `${adminPrefix}/elections` : "/elections";
      case "candidates":
        return adminPrefix ? `${adminPrefix}/candidates` : "/candidates";
      case "audit-logs":
        return adminPrefix ? `${adminPrefix}/audit-logs` : "/audit-logs";
      case "results-dashboard":
        return adminPrefix
          ? `${adminPrefix}/results-dashboard`
          : "/results-dashboard";
      case "geography":
        return adminPrefix ? `${adminPrefix}/geography` : "/geography";
      case "security":
        return adminPrefix ? `${adminPrefix}/security` : "/security";
      case "observer-evidence":
        return adminPrefix
          ? `${adminPrefix}/observer-evidence`
          : "/observer-evidence";
      case "voter-hub":
        return "/voter-hub";
      case "voter-hub-admin":
        return "/voter-hub-admin";
      case "registration":
        return adminPrefix ? `${adminPrefix}/registration` : "/registration";
      case "voting-booth":
        return "/voting-booth";
      case "receipt-verification":
        return "/receipt-verification";
      case "dashboard":
        return adminPrefix ? `${adminPrefix}/dashboard` : "/dashboard";
      default:
        return "/login";
    }
  };
  const [view, setViewState] = useState<string>(() =>
    viewFromPath(location.pathname),
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "am";
  const realtimeEnabled = [
    "dashboard",
    "registration",
    "voter-hub",
    "voting-booth",
    "results-dashboard",
  ].includes(view);
  const {
    results,
    electionPhase,
    currentElectionId,
    currentElectionTitle,
    currentElectionStatus,
    setElectionPhase,
  } = useElectionRealtime(token, realtimeEnabled);
  const canManageObserverEvidence =
    role === "OBSERVER" || role === "ADMIN" || role === "SUPER_ADMIN";

  const getHomeViewForRole = (currentRole: Role | "NONE") =>
    currentRole === "VOTER"
      ? "voter-hub"
      : currentRole === "NONE"
        ? "login"
        : "dashboard";

  const publicViews = new Set([
    "login",
    "password-reset",
    "help",
    "history",
    "registration",
    "receipt-verification",
  ]);

  const canAccessView = (nextView: string) => {
    switch (nextView) {
      case "login":
      case "password-reset":
      case "help":
      case "history":
      case "receipt-verification":
        return true;
      case "voters":
        return checkPerm(role, "MANAGE_VOTERS");
      case "users":
        return checkPerm(role, "MANAGE_USERS");
      case "elections":
        return checkPerm(role, "MANAGE_ELECTIONS");
      case "candidates":
        return checkPerm(role, "MANAGE_CANDIDATES");
      case "audit-logs":
        return checkPerm(role, "VIEW_AUDIT_LOGS");
      case "results-dashboard":
        return checkPerm(role, "VIEW_RESULTS");
      case "geography":
        return (
          checkPerm(role, "MANAGE_REGIONS") ||
          checkPerm(role, "MANAGE_DISTRICTS") ||
          checkPerm(role, "MANAGE_POLLING_STATIONS")
        );
      case "security":
        return isMfaEligibleRole(role);
      case "observer-evidence":
        return canManageObserverEvidence;
      case "voter-hub":
        return role === "VOTER";
      case "voter-hub-admin":
        return checkPerm(role, "MANAGE_ELECTIONS");
      case "registration":
        return true;
      case "voting-booth":
        return Boolean(token);
      case "dashboard":
        return Boolean(token) && role !== "NONE";
      default:
        return false;
    }
  };

  const effectiveView = !token && !publicViews.has(view) ? "login" : view;
  const viewIsBlocked =
    token && effectiveView !== "login" && !canAccessView(effectiveView);

  type SidebarItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    view: string;
  };

  const sidebarItems: SidebarItem[] = (() => {
    if (!token) return [];

    const items: SidebarItem[] = [];

    if (role === "VOTER") {
      items.push({
        key: "voter-hub",
        label: t("voter_hub"),
        icon: <User size={18} />,
        view: "voter-hub",
      });
    }

    if (role !== "NONE") {
      items.push({
        key: "dashboard",
        label: t("dashboard"),
        icon: <LayoutDashboard size={18} />,
        view: "dashboard",
      });
    }

    if (checkPerm(role, "MANAGE_VOTERS")) {
      items.push({
        key: "registration",
        label: t("registration"),
        icon: <UserPlus size={18} />,
        view: "registration",
      });
      items.push({
        key: "voters",
        label: t("voter_registry"),
        icon: <UserCheck size={18} />,
        view: "voters",
      });
    }

    if (checkPerm(role, "MANAGE_USERS")) {
      items.push({
        key: "users",
        label: t("user_management"),
        icon: <Lock size={18} />,
        view: "users",
      });
    }

    if (checkPerm(role, "MANAGE_ELECTIONS")) {
      items.push({
        key: "voter-hub-admin",
        label: "Manage Election Opening",
        icon: <Vote size={18} />,
        view: "voter-hub-admin",
      });
      items.push({
        key: "elections",
        label: lang === "en" ? "Elections" : "ምርጫዎች",
        icon: <Vote size={18} />,
        view: "elections",
      });
      items.push({
        key: "candidates",
        label: lang === "en" ? "Candidates" : "ዕጩዎች",
        icon: <Boxes size={18} />,
        view: "candidates",
      });
    }

    if (checkPerm(role, "VIEW_AUDIT_LOGS")) {
      items.push({
        key: "audit-logs",
        label: t("audit_logs"),
        icon: <Activity size={18} />,
        view: "audit-logs",
      });
    }

    if (checkPerm(role, "VIEW_RESULTS")) {
      items.push({
        key: "results-dashboard",
        label: t("results_console"),
        icon: <PieChart size={18} />,
        view: "results-dashboard",
      });
    }

    if (
      checkPerm(role, "MANAGE_REGIONS") ||
      checkPerm(role, "MANAGE_DISTRICTS") ||
      checkPerm(role, "MANAGE_POLLING_STATIONS")
    ) {
      items.push({
        key: "geography",
        label: "Geography",
        icon: <Globe size={18} />,
        view: "geography",
      });
    }

    if (canManageObserverEvidence) {
      items.push({
        key: "observer-evidence",
        label: "Evidence",
        icon: <ShieldCheck size={18} />,
        view: "observer-evidence",
      });
    }

    if (isMfaEligibleRole(role)) {
      items.push({
        key: "security",
        label: "Security",
        icon: <Shield size={18} />,
        view: "security",
      });
    }

    items.push({
      key: "help",
      label: t("help"),
      icon: <HelpCircle size={18} />,
      view: "help",
    });

    items.push({
      key: "history",
      label: t("history"),
      icon: <History size={18} />,
      view: "history",
    });

    return items;
  })();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Restore persisted auth state so deep-links and sidebar navigation
  // behave seamlessly across reloads for admins.
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("nehs_token");
      const savedRole = localStorage.getItem("nehs_role") as Role | null;
      const savedUser = localStorage.getItem("nehs_user");
      const savedSession = localStorage.getItem("nehs_sessionId");

      if (savedToken && !isJwtAccessToken(savedToken)) {
        localStorage.removeItem("nehs_token");
        localStorage.removeItem("nehs_role");
        localStorage.removeItem("nehs_user");
        localStorage.removeItem("nehs_sessionId");
      } else if (savedToken) {
        setToken(savedToken);
        if (savedRole) setRole(savedRole as Role);
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const normalizedUser = {
            ...parsedUser,
            uniqueVoterId:
              parsedUser?.uniqueVoterId ??
              parsedUser?.voterId ??
              parsedUser?.id ??
              null,
          };

          if (!normalizedUser.uniqueVoterId && normalizedUser.nationalId) {
            delete normalizedUser.nationalId;
          }

          setUser({
            ...normalizedUser,
          });
        }
        if (savedSession) setSessionId(savedSession);
      }
    } catch (e) {
      // ignore corrupted localStorage
    } finally {
      setAuthHydrated(true);
    }
  }, []);

  // Persist auth state when it changes so navigation remains consistent.
  useEffect(() => {
    if (token) localStorage.setItem("nehs_token", token);
    else localStorage.removeItem("nehs_token");

    if (role && role !== "NONE") localStorage.setItem("nehs_role", role);
    else localStorage.removeItem("nehs_role");

    if (user) localStorage.setItem("nehs_user", JSON.stringify(user));
    else localStorage.removeItem("nehs_user");

    if (sessionId) localStorage.setItem("nehs_sessionId", sessionId);
    else localStorage.removeItem("nehs_sessionId");
  }, [token, role, user, sessionId]);

  useEffect(() => {
    if (!token || role === "NONE") {
      setOpenElectionContext({ id: null, title: null, status: null });
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadOpenElection = async () => {
      try {
        const response = await fetchJson<{ data: any }>(
          "/api/v1/elections/current/open",
          {},
        );

        const election = response?.data ?? null;
        if (!active) return;

        setOpenElectionContext({
          id: election?.id ?? null,
          title: election?.title ?? null,
          status: election?.status ?? null,
        });
        if (election?.status) {
          setElectionPhase(mapStatusToPhase(election.status));
        }
      } catch {
        if (!active) return;
        setOpenElectionContext({ id: null, title: null, status: null });
      }
    };

    void loadOpenElection();
    timer = setInterval(() => {
      void loadOpenElection();
    }, 5000);

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [token, role]);

  useEffect(() => {
    if (!authHydrated) return;

    const nextView = viewFromPath(location.pathname);
    // Defensive: only update state when the derived view actually changes.
    // Add debug logs to help reproduce back-button navigation problems.
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(
        "AppShell: location.pathname ->",
        location.pathname,
        "derivedView->",
        nextView,
        "currentView->",
        view,
        "token->",
        Boolean(token),
      );
    }

    if (nextView !== view) {
      setViewState(nextView);
    }

    if (location.pathname === "/") {
      navigate(pathFromView(getHomeViewForRole(role)), { replace: true });
    }
  }, [authHydrated, location.pathname, navigate, role, view]);

  const setView = (nextView: string) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(
        "AppShell.setView ->",
        nextView,
        "path->",
        pathFromView(nextView),
      );
    }

    setViewState(nextView);
    navigate(pathFromView(nextView));
    setMobileMenuOpen(false);
  };

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
    // Clear persisted state too so logout is thorough
    try {
      localStorage.removeItem("nehs_token");
      localStorage.removeItem("nehs_role");
      localStorage.removeItem("nehs_user");
      localStorage.removeItem("nehs_sessionId");
    } catch {
      // ignore
    }
    setView("login");
  };

  if (!authHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-black uppercase tracking-[0.3em]">
        Loading session...
      </div>
    );
  }

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
            {/* Render deterministic sidebar from role -> menu mapping */}
            {sidebarItems.map((it) => (
              <button
                key={it.key}
                onClick={() => setView(it.view)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300",
                  view === it.view
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                {it.icon}
                <span className="text-sm tracking-tight">{it.label}</span>
              </button>
            ))}

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
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setView(item.view);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left font-bold text-slate-700 p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
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
            {viewIsBlocked ? (
              <div className="max-w-3xl mx-auto py-24 text-center">
                <ShieldCheck
                  size={48}
                  className="mx-auto text-slate-200 mb-4"
                />
                <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">
                  {t("access_denied")}
                </h3>
                <p className="text-slate-500 text-sm mt-2">
                  You do not have access to this page for your current role.
                </p>
                <button
                  onClick={clearAuthState}
                  className="mt-8 bg-election-dark text-white px-8 py-3 rounded-xl font-bold"
                >
                  Go to login
                </button>
              </div>
            ) : null}
            {/* View Switching (keep existing render logic) */}
            {effectiveView === "login" && (
              <LoginView
                key="login"
                setRole={setRole}
                setUser={setUser}
                setToken={setToken}
                setSessionId={setSessionId}
                setView={setView}
                results={results}
                t={t}
                i18n={i18n}
              />
            )}
            {effectiveView === "password-reset" && (
              <PasswordResetView setView={setView} />
            )}
            {effectiveView === "help" && (
              <HelpView
                setView={setView}
                role={role}
                homeView={getHomeViewForRole(role)}
                t={t}
                i18n={i18n}
              />
            )}
            {effectiveView === "history" && (
              <HistoryView
                setView={setView}
                role={role}
                homeView={getHomeViewForRole(role)}
                t={t}
                i18n={i18n}
              />
            )}
            {effectiveView === "voters" && checkPerm(role, "MANAGE_VOTERS") && (
              <VoterRegistryView
                setView={setView}
                token={token}
                t={t}
                i18n={i18n}
                user={user}
                currentElectionId={currentElectionId}
              />
            )}
            {effectiveView === "users" && checkPerm(role, "MANAGE_USERS") && (
              <UserManagementView
                setView={setView}
                token={token}
                t={t}
                i18n={i18n}
                user={user}
              />
            )}
            {effectiveView === "elections" &&
              checkPerm(role, "MANAGE_ELECTIONS") && (
                <ElectionManagementView
                  setView={setView}
                  token={token}
                  user={user}
                />
              )}
            {effectiveView === "candidates" &&
              checkPerm(role, "MANAGE_CANDIDATES") && (
                <CandidateManagementView
                  setView={setView}
                  token={token}
                  user={user}
                />
              )}
            {effectiveView === "audit-logs" &&
              checkPerm(role, "VIEW_AUDIT_LOGS") && (
                <AuditLogsView
                  setView={setView}
                  token={token}
                  t={t}
                  i18n={i18n}
                />
              )}
            {effectiveView === "results-dashboard" &&
              checkPerm(role, "VIEW_RESULTS") && (
                <ResultsDashboardView
                  setView={setView}
                  token={token}
                  t={t}
                  i18n={i18n}
                />
              )}
            {effectiveView === "geography" &&
              (checkPerm(role, "MANAGE_REGIONS") ||
                checkPerm(role, "MANAGE_DISTRICTS") ||
                checkPerm(role, "MANAGE_POLLING_STATIONS")) && (
                <GeographyManagementView
                  setView={setView}
                  token={token}
                  user={user}
                />
              )}
            {effectiveView === "security" && isMfaEligibleRole(role) && (
              <MfaSecurityView setView={setView} token={token} />
            )}
            {effectiveView === "observer-evidence" &&
              canManageObserverEvidence && (
                <ObserverEvidenceView
                  token={token}
                  role={role}
                  setView={setView}
                />
              )}
            {effectiveView === "voter-hub" && role === "VOTER" && (
              <VoterHub
                key="voter"
                user={user}
                token={token}
                setView={setView}
                t={t}
                role={role}
                electionPhase={electionPhase}
                currentElectionId={openElectionContext.id ?? currentElectionId}
                currentElectionTitle={
                  openElectionContext.title ?? currentElectionTitle
                }
                currentElectionStatus={
                  openElectionContext.status ?? currentElectionStatus
                }
                i18n={i18n}
              />
            )}

            {effectiveView === "voter-hub-admin" &&
              checkPerm(role, "MANAGE_ELECTIONS") && (
                <AdminOpenElectionView
                  key="voter-admin"
                  setView={setView}
                  token={token}
                  t={t}
                  i18n={i18n}
                />
              )}
            {effectiveView === "registration" &&
              (electionPhase === "REGISTRATION" ? (
                <RegistrationView
                  key="reg"
                  setView={setView}
                  t={t}
                  canRegister={checkPerm(role, "MANAGE_VOTERS")}
                  role={role}
                  token={token}
                  onRegistered={({ token, role, sessionId, user }: any) => {
                    setToken(token);
                    setRole(role);
                    setSessionId(sessionId);
                    setUser(user);
                    setView("voter-hub");
                  }}
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
            {effectiveView === "voting-booth" &&
              (role === "VOTER" || checkPerm(role, "MANAGE_ELECTIONS")) &&
              (electionPhase === "VOTING" || role === "ADMIN" ? (
                <VotingBoothView
                  key="booth"
                  token={token}
                  setView={setView}
                  setUser={setUser}
                  role={role}
                  t={t}
                  currentElectionId={
                    openElectionContext.id ?? currentElectionId
                  }
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
            {effectiveView === "dashboard" && token && role !== "VOTER" && (
              <DashboardView
                key="dash"
                results={results}
                role={role}
                setView={setView}
                t={t}
                user={user}
                electionPhase={electionPhase}
                setElectionPhase={(phase: string) =>
                  setElectionPhase(phase as any)
                }
                token={token}
                i18n={i18n}
              />
            )}
            {effectiveView === "dashboard" && role === "VOTER" && (
              <VoterHub
                key="voter-dashboard"
                user={user}
                token={token}
                setView={setView}
                t={t}
                role={role}
                electionPhase={electionPhase}
                currentElectionId={openElectionContext.id ?? currentElectionId}
                currentElectionTitle={
                  openElectionContext.title ?? currentElectionTitle
                }
                currentElectionStatus={
                  openElectionContext.status ?? currentElectionStatus
                }
                i18n={i18n}
              />
            )}
            {effectiveView === "receipt-verification" && (
              <ReceiptVerificationView
                token={token}
                setView={setView}
                t={t}
                homeView={getHomeViewForRole(role)}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
      {isDev && (
        <div className="fixed bottom-4 right-4 bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs z-50">
          <div className="font-mono text-[11px] text-slate-700">
            path: {location.pathname}
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            view: {view}
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            derived: {viewFromPath(location.pathname)}
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            effective: {effectiveView}
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            token: {token ? "yes" : "no"}
          </div>
        </div>
      )}
    </div>
  );
}
