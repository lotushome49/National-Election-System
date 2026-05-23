import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Fingerprint,
  Search,
  ListChecks,
} from "lucide-react";
import { StatCard } from "../results/StatCard";

export function StaffDashboard({ setView, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const cards = [
    {
      title: "Fast Search",
      value: "Live",
      sub: "Citizen lookup ready",
      icon: <Search size={24} />,
    },
    {
      title: "Verification Queue",
      value: "24",
      sub: "Awaiting review",
      icon: <ListChecks size={24} />,
    },
    {
      title: "Today’s Registrations",
      value: "124",
      sub: "Completed sessions",
      icon: <Fingerprint size={24} />,
    },
    {
      title: "Match Score",
      value: "99.2%",
      sub: "Identity confidence",
      icon: <Activity size={24} />,
    },
  ];

  const progress = [72, 64, 81, 77, 90, 86];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20 space-y-12"
    >
      <div className="flex flex-col lg:flex-row justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Search size={14} className="text-slate-900" />
            Staff Workbench
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("registration")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl uppercase tracking-widest">
            Fast verification and registration support for polling staff.
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
              onClick={() => setView("voters")}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
            >
              Queue
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <BarChart3 size={22} className="text-slate-900" />
          <h3 className="text-2xl font-display font-black tracking-tighter uppercase">
            Daily volume
          </h3>
        </div>
        <div className="flex items-end gap-3 h-56">
          {progress.map((value, index) => (
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
                D{index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
