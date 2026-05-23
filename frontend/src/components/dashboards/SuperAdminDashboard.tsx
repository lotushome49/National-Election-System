import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
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
  const nationalBallots = overview?.totalBallots ?? results?.total ?? 12840;

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
      title: "National Users",
      value: "12,480",
      sub: "Across all active roles",
      icon: <Users size={24} />,
    },
    {
      title: "Active Elections",
      value: "4",
      sub: "National and local cycles",
      icon: <Vote size={24} />,
    },
    {
      title: "Security Health",
      value: "98.6%",
      sub: "MFA and session coverage",
      icon: <ShieldCheck size={24} />,
    },
    {
      title: "Live Alerts",
      value: "7",
      sub: "Open items requiring review",
      icon: <AlertTriangle size={24} />,
    },
  ];

  const auditTrends = [
    { label: "Auth", value: 92 },
    { label: "Scope", value: 88 },
    { label: "Data", value: 76 },
    { label: "Export", value: 64 },
  ];

  const roles = [
    { label: "SUPER_ADMIN", value: 1 },
    { label: "ADMIN", value: 4 },
    { label: "REGIONAL_ADMIN", value: 12 },
    { label: "DISTRICT_ADMIN", value: 32 },
    { label: "STAFF", value: 54 },
    { label: "OBSERVER", value: 8 },
    { label: "VOTER", value: 9800 },
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
        <div className="xl:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-10">
            <BarChart3 size={22} className="text-slate-900" />
            <h3 className="text-2xl font-display font-black tracking-tighter uppercase">
              Audit Trend
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
                  {role.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/50">
            {nationalBallots.toLocaleString()} ballots anchored in the live
            stream.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
