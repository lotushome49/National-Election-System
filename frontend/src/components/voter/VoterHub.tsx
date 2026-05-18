import React from "react";
import { motion } from "motion/react";
import {
  Lock,
  ShieldCheck,
  Activity,
  Fingerprint,
  BarChart3,
  Vote,
  CheckCircle2,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";

export function VoterHub({ user, setView, t, role, electionPhase, i18n }: any) {
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
