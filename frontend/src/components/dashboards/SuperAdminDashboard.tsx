import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  FileCheck,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";
import { StatCard } from "../results/StatCard";
import { useEffect, useState } from "react";
import { fetchOverview } from "../../services/api/reports";

export function SuperAdminDashboard({ setView, t, i18n, results, token }: any) {
  const lang = i18n.language as "en" | "am";
  const [overview, setOverview] = useState<any>(null);
  const summary = overview ?? results ?? {};
  const totalBallots = Number(summary?.totalBallots ?? summary?.total ?? 0);
  const totalRegisteredVoters = Number(summary?.totalRegisteredVoters ?? 0);
  const turnoutPercentage = Number(summary?.turnoutPercentage ?? 0);
  const leadingCandidate = summary?.candidateStandings?.[0];
  const topRegion = Array.isArray(summary?.regionalBreakdown)
    ? summary.regionalBreakdown[0]
    : null;

  useEffect(() => {
    let mounted = true;
    if (!token) return;
    fetchOverview(token)
      .then((data) => {
        if (mounted) setOverview(data);
      })
      .catch(() => {
        /* best-effort: keep placeholders on failure */
      });
    return () => {
      mounted = false;
    };
  }, [token]);
  const cards = [
    {
      title: "National Ballots",
      value: totalBallots.toLocaleString(),
      sub: summary?.election?.title || "Current national tally",
      icon: <Users size={24} />,
    },
    {
      title: "Registered Voters",
      value: totalRegisteredVoters.toLocaleString(),
      sub: "In scope for this overview",
      icon: <Vote size={24} />,
    },
    {
      title: "Turnout",
      value: `${turnoutPercentage.toFixed(1)}%`,
      sub: "Derived from live report totals",
      icon: <ShieldCheck size={24} />,
    },
    {
      title: "Top Region",
      value: topRegion?.regionName ?? "N/A",
      sub: topRegion
        ? `${Number(topRegion.totalBallots ?? 0).toLocaleString()} ballots`
        : "Waiting for breakdown data",
      icon: <AlertTriangle size={24} />,
    },
  ];

  const auditTrends = Array.isArray(summary?.regionalBreakdown)
    ? summary.regionalBreakdown.slice(0, 4).map((region: any) => ({
        label: region.regionName,
        value:
          totalBallots > 0
            ? Math.round(
                (Number(region.totalBallots ?? 0) / totalBallots) * 100,
              )
            : 0,
      }))
    : [];

  const roles = [
    { label: "BALLOTS", value: totalBallots },
    { label: "REGISTERED", value: totalRegisteredVoters },
    { label: "TURNOUT", value: turnoutPercentage },
    {
      label: "REGIONS",
      value: Array.isArray(summary?.regionalBreakdown)
        ? summary.regionalBreakdown.length
        : 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20 space-y-12"
    >
      <div className="flex flex-col lg:flex-row justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Database size={14} className="text-slate-900" />
            National Oversight
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("dashboard")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl uppercase tracking-widest">
            National control room for election health, role coverage, and live
            risk review.
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-4">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            National operations live
          </div>
          {setView && (
            <div className="flex gap-2">
              <button
                onClick={() => setView("elections")}
                className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                Open Election Manager
              </button>
              <button
                onClick={() => setView("observer-evidence")}
                className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"
              >
                <FileCheck size={14} />
                Observer evidence
              </button>
              <button
                onClick={() => setView("users")}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
              >
                Users
              </button>
              <button
                onClick={() => setView("results-dashboard")}
                className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                Results
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="dashboard-panel xl:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-10">
            <BarChart3 size={22} className="text-slate-900" />
            <h3 className="text-2xl font-display font-black tracking-tighter uppercase">
              Regional Breakdown
            </h3>
          </div>
          <div className="space-y-6">
            {auditTrends.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-50 border border-slate-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1.1 }}
                    className="h-full rounded-full bg-slate-900"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            <Activity size={14} />
            Live summary
          </div>
          <div className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.label}
                className="flex items-center justify-between"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {role.label}
                </span>
                <span className="font-display font-black text-xl">
                  {typeof role.value === "number"
                    ? role.value.toLocaleString()
                    : String(role.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/50">
            {totalBallots.toLocaleString()} ballots anchored in the live stream.
          </div>
          {leadingCandidate && (
            <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/50 space-y-2">
              <div>{leadingCandidate.fullName}</div>
              <div>
                {Number(leadingCandidate.votes ?? 0).toLocaleString()} votes ·{" "}
                {Number(leadingCandidate.percentage ?? 0).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
