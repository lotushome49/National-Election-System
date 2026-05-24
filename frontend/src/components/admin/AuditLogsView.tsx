import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { cn } from "../../utils/cn";
import { unwrapApiData } from "../../utils/mfa";

export function AuditLogsView({ setView, token, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/v1/audit", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Failed to load audit logs: ${response.status}`);
        }
        const data = await response.json();
        const entries = unwrapApiData<any[]>(data);
        setLogs([...entries].reverse()); // Show latest first
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-16">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> {t("back_to_dashboard")}
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase leading-none">
            {t("cryptographic_ledger")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("audit_ledger_desc")}
          </p>
        </div>

        <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-6 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all border border-transparent"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("live_sync_active")}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden font-mono text-[10px] relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={200} />
        </div>

        {loading ? (
          <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("decrypting_logs")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-32 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("no_audit_events")}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 relative z-10">
            {logs.map((log, i) => (
              <div
                key={i}
                className="p-8 flex flex-col md:flex-row items-start gap-8 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="shrink-0 w-44 text-slate-300 font-black uppercase tracking-tighter group-hover:text-slate-500 transition-colors">
                  {new Date(log.timestamp || log.time).toLocaleString()}
                </div>
                <div className="grow">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={cn(
                        "font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1.5 rounded-lg shadow-sm",
                        log.event.includes("SUCCESS") ||
                          log.event === "VOTER_REGISTERED"
                          ? "bg-emerald-500 text-white"
                          : log.event.includes("FAILED") ||
                              log.event.includes("LOCKED")
                            ? "bg-rose-500 text-white"
                            : "bg-slate-900 text-white font-mono",
                      )}
                    >
                      {log.event}
                    </span>
                    <div className="h-px w-8 bg-slate-100" />
                    <span className="text-slate-300 font-black opacity-40">
                      #{100000 + (logs.length - i)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    {Object.entries(log)
                      .filter(
                        ([k]) =>
                          k !== "event" && k !== "timestamp" && k !== "time",
                      )
                      .map(([k, v]: [any, any]) => (
                        <div key={k} className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {k}
                          </span>
                          <span
                            className="text-slate-900 font-black truncate block text-xs"
                            title={String(v)}
                          >
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
