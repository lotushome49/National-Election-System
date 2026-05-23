import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  UserCheck,
  Users,
  Vote,
} from "lucide-react";
import { StatCard } from "../results/StatCard";

export function AdminDashboard({ setView, t, i18n, results }: any) {
  const lang = i18n.language as "en" | "am";
  const cards = [
    {
      title: "Active Elections",
      value: "4",
      sub: "Managed from the national office",
      icon: <Vote size={24} />,
    },
    {
      title: "Pending Approvals",
      value: "18",
      sub: "Users, candidates, and changes",
      icon: <Clock size={24} />,
    },
    {
      title: "Registry Health",
      value: "96%",
      sub: "Sync and validation status",
      icon: <UserCheck size={24} />,
    },
    {
      title: "Live Voters",
      value: (results?.total ?? 0).toLocaleString(),
      sub: "Captured in the current tally",
      icon: <Users size={24} />,
    },
  ];

  const registrationTrend = [84, 88, 91, 94, 97, 96];
  const regionMix = [
    { label: "Addis", value: 92 },
    { label: "Oromia", value: 85 },
    { label: "Amhara", value: 79 },
    { label: "SNNPR", value: 71 },
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
            <Activity size={14} className="text-slate-900" />
            Administrative Control
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("dashboard")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl uppercase tracking-widest">
            Daily operations for elections, users, and voter registry health.
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-4">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          {setView && (
            <button
              onClick={() => setView("users")}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              Manage Users <ArrowRight size={14} />
            </button>
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
              Registration Trend
            </h3>
          </div>
          <div className="flex items-end gap-3 h-52">
            {registrationTrend.map((value, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-3"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ duration: 1 }}
                  className="w-full max-w-12 bg-slate-900 rounded-t-2xl mt-auto"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  W{index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            <Clock size={14} />
            Operations queue
          </div>
          {regionMix.map((region) => (
            <div key={region.label} className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                <span>{region.label}</span>
                <span>{region.value}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${region.value}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
