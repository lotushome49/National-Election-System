import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Fingerprint,
  Search,
  ListChecks,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "../results/StatCard";
import { fetchOverview } from "../../services/api/reports";
import { fetchJson } from "../../services/api/client";

function getErrorMessage(error: unknown, fallback: string) {
  const body = (error as any)?.body;
  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (typeof (error as any)?.message === "string") {
    return (error as any).message;
  }

  return fallback;
}

export function StaffDashboard({ setView, t, i18n, token }: any) {
  const lang = i18n.language as "en" | "am";
  const [overview, setOverview] = useState<any>(null);
  const [voters, setVoters] = useState<any[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;
    if (!token) return;

    const loadVoters = async () => {
      setLoadingVoters(true);
      setError(null);
      try {
        const response = await fetchJson<{ data: any[] }>(
          "/api/v1/voters?page=1&limit=100",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (mounted) {
          setVoters(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err, "Failed to load voter queue"));
          setVoters([]);
        }
      } finally {
        if (mounted) {
          setLoadingVoters(false);
        }
      }
    };

    void loadVoters();

    return () => {
      mounted = false;
    };
  }, [token]);

  const pendingVoters = voters.filter((voter) => !voter.isVerified);
  const verifiedVoters = voters.filter((voter) => voter.isVerified);
  const verificationRate =
    voters.length > 0
      ? Math.round((verifiedVoters.length / voters.length) * 1000) / 10
      : 0;
  const electionStatus = overview?.election?.status || "UNKNOWN";
  const electionTitle = overview?.election?.title || "Current election";

  const handleVerification = async (voterId: string, verified: boolean) => {
    setActionId(voterId);
    setError(null);
    try {
      await fetchJson(`/api/v1/voters/${voterId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified }),
      });

      setVoters((prev) =>
        prev.map((voter) =>
          voter.id === voterId ? { ...voter, isVerified: verified } : voter,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update voter verification"));
    } finally {
      setActionId(null);
    }
  };

  const cards = [
    {
      title: "Fast Search",
      value: "Live",
      sub: "Citizen lookup ready",
      icon: <Search size={24} />,
    },
    {
      title: "Verification Queue",
      value: pendingVoters.length.toLocaleString(),
      sub: "Awaiting review",
      icon: <ListChecks size={24} />,
    },
    {
      title: "Today’s Registrations",
      value: overview?.todaysRegistrations ?? "0",
      sub: "Completed sessions",
      icon: <Fingerprint size={24} />,
    },
    {
      title: "Verification Rate",
      value: `${verificationRate.toFixed(1)}%`,
      sub: "Verified voters in queue",
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

          <div className="inline-flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Election Status
            </span>
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] bg-slate-900 text-white">
              {electionStatus.replaceAll("_", " ")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {electionTitle}
            </span>
          </div>
        </div>
        <div className="flex flex-col lg:items-end gap-4">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Live Staff Queue
            </div>
            <h3 className="text-2xl font-display font-black tracking-tighter uppercase mt-2">
              Voter verification approvals
            </h3>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loadingVoters ? (
          <div className="p-12 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] animate-pulse">
            Loading voter queue
          </div>
        ) : pendingVoters.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
            No voters awaiting approval.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingVoters.slice(0, 6).map((voter) => (
              <div
                key={voter.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/60"
              >
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-tight text-slate-900">
                    {voter.fullName}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    {voter.nationalId} · {voter.regionId || "National"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleVerification(voter.id, true)}
                    disabled={actionId === voter.id}
                    className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {actionId === voter.id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setView?.("voters")}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
