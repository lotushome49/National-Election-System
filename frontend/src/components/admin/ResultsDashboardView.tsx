import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Users,
  PieChart,
  Download,
  BarChart3,
} from "lucide-react";
import { StatCard } from "../results/StatCard";

export function ResultsDashboardView({ setView, token, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/overview", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        const overview = payload?.data;
        const rawStandings = Array.isArray(overview?.candidateStandings)
          ? overview.candidateStandings
          : [];

        setResults({
          electionId: overview?.election?.id,
          total: overview?.totalBallots ?? 0,
          counts: rawStandings.map((candidate: any) => ({
            id: candidate.candidateId,
            // candidate object shape varies; normalize to safe strings
            displayName:
              candidate.fullName ??
              candidate.name ??
              String(candidate.candidateId ?? "Unknown"),
            party:
              typeof candidate.party === "string"
                ? candidate.party
                : (candidate.party?.name ??
                  candidate.party?.code ??
                  String(candidate.party ?? "")),
            votes: Number(candidate.votes ?? 0),
          })),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch results:", err);
        setResults({ total: 0, counts: [] });
        setLoading(false);
      });
  }, [token]);

  if (loading)
    return (
      <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
        {t("fetching_live_tally")}
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto pb-20 space-y-12"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("live_audit_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("election_results")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("results_live_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("verified_tally")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          title={t("total_ballots_anchored")}
          value={results.total.toLocaleString()}
          sub={t("cryptographically_verified")}
          icon={<Users size={24} />}
        />
        <StatCard
          title={t("estimated_turnout")}
          value={`${((results.total / 1000) * 100).toFixed(1)}%`}
          sub={t("real_time_calc")}
          icon={<PieChart size={24} />}
        />
        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              try {
                const electionQuery = results?.electionId
                  ? `?electionId=${encodeURIComponent(results.electionId)}`
                  : "";
                const resp = await fetch(
                  `/api/reports/export/turnout${electionQuery}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );
                if (!resp.ok) throw new Error("Failed to export turnout");
                const blob = await resp.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nehs_turnout_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                console.error(e);
                alert("Error exporting turnout CSV");
              }
            }}
            className="px-6 py-4 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3"
          >
            <Download size={16} />
            {t("export_csv")}
            <span className="text-[9px] text-slate-400 ml-2">(Turnout)</span>
          </button>

          <button
            onClick={async () => {
              try {
                const electionQuery = results?.electionId
                  ? `?electionId=${encodeURIComponent(results.electionId)}`
                  : "";
                const resp = await fetch(
                  `/api/reports/export/demographics${electionQuery}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );
                if (!resp.ok) throw new Error("Failed to export demographics");
                const blob = await resp.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nehs_demographics_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                console.error(e);
                alert("Error exporting demographics CSV");
              }
            }}
            className="px-6 py-4 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3"
          >
            <Download size={16} />
            {t("export_csv")}
            <span className="text-[9px] text-slate-400 ml-2">
              (Demographics)
            </span>
          </button>
        </div>
        <button
          onClick={async () => {
            try {
              const electionQuery = results?.electionId
                ? `?electionId=${encodeURIComponent(results.electionId)}`
                : "";
              const response = await fetch(
                `/api/reports/export/csv${electionQuery}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!response.ok) throw new Error("Failed to export");
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nehs_results_${Date.now()}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e) {
              console.error(e);
              alert("Error exporting CSV");
            }
          }}
          className="lg:col-span-2 bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl hover:bg-slate-800 transition-all group relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Download size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <span className="font-display font-black text-3xl tracking-tighter uppercase leading-none block">
              {t("export_full_dataset")}
            </span>
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block">
              {t("export_compliance_ready")}
            </span>
          </div>
          <div className="mt-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 px-4 py-2 rounded-xl">
              {t("format_csv_json")}
            </span>
          </div>
        </button>
      </div>

      <div className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BarChart3 size={160} />
        </div>
        <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
          <BarChart3 className="text-slate-900" size={28} />
          {t("candidate_standings")}
        </h3>
        <div className="space-y-10 relative z-10">
          {results.counts.map((c: any) => (
            <div key={c.id} className="space-y-4 group/bar">
              <div className="flex justify-between items-end mb-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">
                    {c.party}
                  </span>
                  <span className="text-xl font-display font-black text-slate-900 uppercase tracking-tighter group-hover/bar:translate-x-1 transition-transform inline-block">
                    {c.displayName}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-2xl font-display font-black text-slate-900 tabular-nums">
                    {c.votes.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">
                    {results.total > 0
                      ? `${((c.votes / results.total) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-50 h-4 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${results.total > 0 ? (c.votes / results.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="bg-slate-900 h-full rounded-full shadow-lg relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20 p-12 bg-emerald-50 rounded-[3.5rem] border border-emerald-100 text-emerald-900/60 font-mono text-[10px] uppercase tracking-widest text-center">
        {t("results_cryptographically_signed_by_nehs")}
      </div>
    </motion.div>
  );
}
