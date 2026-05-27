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
import { useEffect, useState } from "react";
import { fetchOverview } from "../../services/api/reports";

export function AdminDashboard({ setView, t, i18n, results, token }: any) {
  const lang = i18n.language as "en" | "am";
  const [overview, setOverview] = useState<any>(null);
  const summary = overview ?? results ?? {};
  const totalBallots = Number(summary?.totalBallots ?? summary?.total ?? 0);
  const totalRegisteredVoters = Number(summary?.totalRegisteredVoters ?? 0);
  const turnoutPercentage = Number(summary?.turnoutPercentage ?? 0);
  const leadingCandidate = summary?.candidateStandings?.[0];
  const regionalBreakdown = Array.isArray(summary?.regionalBreakdown)
    ? summary.regionalBreakdown
    : [];

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
      title: "Ballots Counted",
      value: totalBallots.toLocaleString(),
      sub: summary?.election?.title || "Current election summary",
      icon: <Vote size={24} />,
    },
    {
      title: "Registered Voters",
      value: totalRegisteredVoters.toLocaleString(),
      sub: "Across the scoped electorate",
      icon: <Clock size={24} />,
    },
    {
      title: "Turnout",
      value: `${turnoutPercentage.toFixed(1)}%`,
      sub: "Derived from live report totals",
      icon: <UserCheck size={24} />,
    },
    {
      title: "Leading Candidate",
      value: leadingCandidate?.fullName ?? "N/A",
      sub: leadingCandidate
        ? `${Number(leadingCandidate.votes ?? 0).toLocaleString()} votes`
        : "Waiting for tally data",
      icon: <Users size={24} />,
    },
  ];

  const regionMix = regionalBreakdown.slice(0, 4);

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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setView("users")}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                Manage Users <ArrowRight size={14} />
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
          <div className="flex items-end gap-3 h-52">
            {regionMix.length > 0 ? (
              regionMix.map((region: any) => (
                <div
                  key={region.regionId}
                  className="flex-1 flex flex-col items-center gap-3"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max(
                        20,
                        Math.min(
                          100,
                          (Number(region.totalBallots ?? 0) /
                            Math.max(totalBallots, 1)) *
                            100,
                        ),
                      )}%`,
                    }}
                    transition={{ duration: 1 }}
                    className="w-full max-w-12 bg-slate-900 rounded-t-2xl mt-auto"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {region.regionName?.slice(0, 8) ?? "Region"}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full text-[10px] uppercase tracking-[0.3em] text-slate-300">
                No regional breakdown available yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            <Clock size={14} />
            Scoped totals
          </div>
          {regionMix.map((region: any) => (
            <div key={region.regionId} className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                <span>{region.regionName}</span>
                <span>{Number(region.totalBallots ?? 0).toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(
                      20,
                      Math.min(
                        100,
                        (Number(region.totalBallots ?? 0) /
                          Math.max(totalBallots, 1)) *
                          100,
                      ),
                    )}%`,
                  }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          ))}
          {leadingCandidate && (
            <div className="mt-10 p-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/50 space-y-2">
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
