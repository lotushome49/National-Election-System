import React from "react";
import { motion } from "motion/react";
import { Clock, FileCheck, Database, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

export function HistoryView({ setView, role, homeView, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const pastElections = [
    {
      year: "2021",
      title: t("election_6_title"),
      date: t("election_6_date"),
      turnout: "38,234,910",
      winner: "Prosperity Party",
      percentage: "92.4%",
      status: "Certified",
    },
    {
      year: "2015",
      title: t("election_5_title"),
      date: t("election_5_date"),
      turnout: "36,851,461",
      winner: "EPRDF",
      percentage: "100%",
      status: "Archived",
    },
    {
      year: "2010",
      title: t("election_4_title"),
      date: t("election_4_date"),
      turnout: "29,832,190",
      winner: "EPRDF",
      percentage: "99.2%",
      status: "Archived",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Clock size={14} className="text-slate-900" />
            {t("historical_archive_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("democracy_history")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-wide">
            {t("historical_records_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
          >
            {lang === "en" ? "Amharic (አማርኛ)" : "English"}
          </button>
          <button
            onClick={() =>
              setView(
                homeView ||
                  (role === "NONE"
                    ? "login"
                    : role === "VOTER"
                      ? "voter-hub"
                      : "dashboard"),
              )
            }
            className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all"
          >
            {t("return_portal")}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {pastElections.map((election, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative overflow-hidden group hover:shadow-2xl transition-all duration-700"
          >
            <div className="flex items-center gap-10 relative z-10">
              <div className="bg-slate-900 text-white w-28 h-28 rounded-[2.5rem] flex flex-col items-center justify-center border-4 border-slate-800 shadow-xl group-hover:scale-105 transition-transform duration-500">
                <span className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">
                  {t("year")}
                </span>
                <span className="text-4xl font-display font-black leading-none tracking-tighter">
                  {election.year}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {election.title}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  <Clock size={14} />
                  {election.date}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 relative z-10 lg:pl-12 lg:border-l border-slate-50">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("voter_turnout")}
                </p>
                <p className="text-2xl font-display font-black text-slate-900 tracking-tighter">
                  {election.turnout}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("winning_party")}
                </p>
                <p className="text-2xl font-display font-black text-slate-900 tracking-tighter group-hover:text-slate-700 transition-colors">
                  {election.winner}
                </p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  {election.percentage} {t("valid_votes_short")}
                </p>
              </div>
              <div className="hidden lg:block space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t("status_label")}
                </p>
                <span
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2",
                    election.status === "Certified"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-slate-50 text-slate-400 border border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      election.status === "Certified"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-200",
                    )}
                  />
                  {election.status}
                </span>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-slate-50/50 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-end px-12">
              <button className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all">
                <FileCheck size={24} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:opacity-100 transition-opacity opacity-0" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-4 text-center lg:text-left">
            <h3 className="text-4xl font-display font-black tracking-tighter uppercase leading-none">
              {t("registry_verification")}
            </h3>
            <p className="text-sm opacity-50 font-medium leading-relaxed uppercase tracking-widest">
              {t("historical_verifiability_desc")}
            </p>
          </div>
          <button className="bg-white text-slate-900 px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-100 active:scale-95 transition-all shadow-xl shadow-slate-900 flex items-center gap-3">
            {t("access_public_api")}
            <ChevronRight size={18} />
          </button>
        </div>
        <Database
          className="absolute -right-16 -bottom-16 opacity-5"
          size={300}
        />
      </div>
    </motion.div>
  );
}
