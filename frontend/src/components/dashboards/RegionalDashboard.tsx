import React from "react";
import { motion } from "motion/react";
import { BarChart3, Building2, MapPinned, Users, Vote } from "lucide-react";
import { StatCard } from "../results/StatCard";
import { useEffect, useState } from "react";
import { fetchOverview } from "../../services/api/reports";

export function RegionalDashboard({ setView, t, i18n, user, token }: any) {
  const lang = i18n.language as "en" | "am";
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    if (!token) return;
    fetchOverview(token)
      .then((d) => mounted && setOverview(d))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [token]);

  const cards = [
    {
      title: "Region Summary",
      value: user?.regionName || "Selected region",
      sub: "Scope locked to your region",
      icon: <MapPinned size={24} />,
    },
    {
      title: "Districts",
      value: "12",
      sub: "Monitored from this view",
      icon: <Building2 size={24} />,
    },
    {
      title: "Registered Voters",
      value:
        (overview?.totalRegisteredVoters ?? "286,410").toLocaleString?.() ??
        String(overview?.totalRegisteredVoters ?? "286,410"),
      sub: "Regional registry total",
      icon: <Users size={24} />,
    },
    {
      title: "Polling Stations",
      value: "1,284",
      sub: "Open and syncing",
      icon: <Vote size={24} />,
    },
  ];

  const turnout = [86, 74, 81, 69, 92, 77];
  const districts = [
    { label: "North", value: 91 },
    { label: "Central", value: 84 },
    { label: "East", value: 72 },
    { label: "South", value: 88 },
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
            <MapPinned size={14} className="text-slate-900" />
            Regional Oversight
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("regional")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl uppercase tracking-widest">
            Regional command for districts, turnout, and station readiness.
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
              onClick={() => setView("geography")}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
            >
              Open geography
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
              Turnout by District
            </h3>
          </div>
          <div className="space-y-5">
            {turnout.map((value, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>District {index + 1}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-50 border border-slate-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-slate-900"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8">
          <h3 className="text-xl font-display font-black uppercase tracking-tighter">
            District status
          </h3>
          {districts.map((district) => (
            <div key={district.label} className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                <span>{district.label}</span>
                <span>{district.value}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${district.value}%` }}
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
