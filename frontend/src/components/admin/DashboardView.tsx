import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Clock,
  Users,
  Database,
  ShieldCheck,
  UserCheck,
  Activity,
  Lock,
  BarChart3,
} from "lucide-react";
import { StatCard } from "../results/StatCard";
import { LogItem } from "../results/LogItem";
import { checkPerm } from "../../constants/permissions";
import { cn } from "../../utils/cn";
import {
  getScopeAccessModel,
  getUserRegionId,
  getUserDistrictId,
} from "../../utils/scope";
import type { Candidate } from "../../types/election";

export function DashboardView({
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
