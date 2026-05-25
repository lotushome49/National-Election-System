import React from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Vote, CheckCircle2, Clock, Search, Users } from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";
import { fetchJson } from "../../services/api/client";

export function VoterHub({
  user,
  setView,
  t,
  electionPhase,
  currentElectionId,
  token,
  role,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  const [votingStatus, setVotingStatus] = useState<{
    hasVoted: boolean;
    receiptHash: string | null;
    castAt: string | null;
  }>({
    hasVoted: Boolean(user?.hasVoted),
    receiptHash: user?.receiptToken ?? null,
    castAt: null,
  });
  const [candidatePreview, setCandidatePreview] = useState<any[]>([]);
  const isVoter = role === "VOTER";

  useEffect(() => {
    if (!isVoter || !token) {
      return;
    }

    let mounted = true;
    const loadVotingStatus = async () => {
      try {
        const response = await fetchJson<{ data: any }>("/api/v1/voting/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;

        const status = response?.data ?? {};
        setVotingStatus({
          hasVoted: Boolean(status.hasVoted),
          receiptHash: status.receiptHash ?? user?.receiptToken ?? null,
          castAt: status.castAt ?? null,
        });
      } catch {
        if (!mounted) return;
        setVotingStatus((prev) => ({
          ...prev,
          hasVoted: Boolean(user?.hasVoted),
          receiptHash: user?.receiptToken ?? prev.receiptHash,
        }));
      }
    };

    void loadVotingStatus();

    return () => {
      mounted = false;
    };
  }, [isVoter, token, user]);

  useEffect(() => {
    if (!currentElectionId || !token) {
      setCandidatePreview([]);
      return;
    }

    let mounted = true;
    const loadCandidates = async () => {
      try {
        const response = await fetchJson<{ data: any[] }>(
          `/api/v1/candidates?page=1&limit=100&electionId=${encodeURIComponent(currentElectionId)}&status=APPROVED`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!mounted) return;

        setCandidatePreview(
          Array.isArray(response.data)
            ? response.data
                .map((candidate) => ({
                  id: candidate.id,
                  fullName: candidate.fullName,
                  party: candidate.party,
                  symbol: candidate.symbol || candidate.partyCode || "🗳️",
                }))
                .slice(0, 6)
            : [],
        );
      } catch {
        if (!mounted) return;
        setCandidatePreview([]);
      }
    };

    void loadCandidates();

    return () => {
      mounted = false;
    };
  }, [currentElectionId, token]);

  const displayHasVoted = votingStatus.hasVoted;
  const displayReceiptHash = votingStatus.receiptHash;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-20"
    >
      {/* Phase banner */}
      <div className="mb-8">
        <div
          className={cn(
            "px-4 py-2 rounded-xl inline-flex items-center gap-3",
            electionPhase === "VOTING"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              electionPhase === "VOTING" ? "bg-emerald-500" : "bg-blue-500",
            )}
          />
          <span className="text-xs font-black uppercase tracking-wide">
            {t(`phase_${electionPhase.toLowerCase()}`)}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-10 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-black mb-4">{t("voter_hub_title")}</h2>
        <p className="text-sm text-slate-500 mb-6">{t("voter_hub_subtitle")}</p>

        <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
                Current election
              </p>
              <p className="font-black text-slate-900">
                {currentElectionId ?? "No active election"}
              </p>
            </div>
            <span
              className={cn(
                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em]",
                electionPhase === "VOTING"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {t(`phase_${electionPhase.toLowerCase()}`)}
            </span>
          </div>
          {!isVoter && (
            <p className="text-xs text-slate-500">
              Staff can review registration and issue voting tokens from the
              voter registry.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {t("registration_status")}
              </p>
              <p className="font-bold mt-1">
                {isVoter || user.registered
                  ? t("registered")
                  : t("not_registered")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {t("voting_availability")}
              </p>
              <p className="font-bold mt-1">
                {electionPhase === "VOTING" ? t("open") : t("closed")}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            {displayHasVoted ? (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 />
                  <div>
                    <p className="font-black">{t("vote_recorded")}</p>
                    <p className="text-xs text-slate-500">
                      {t("receipt_token")}
                    </p>
                    <p className="font-mono text-sm">
                      {displayReceiptHash ?? "Receipt pending"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setView("receipt-verification")}
                    className="px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] bg-slate-900 text-white"
                  >
                    <Search size={14} className="inline-block mr-2" /> Verify
                    Receipt
                  </button>
                </div>
              </div>
            ) : !isVoter ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <Users className="text-slate-500" />
                  <div>
                    <p className="font-black text-slate-900">Staff access</p>
                    <p className="text-xs text-slate-500">
                      Use the voter registry to verify citizens and issue
                      tokens.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setView("voters")}
                    className="px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] bg-slate-900 text-white"
                  >
                    Open Voter Registry
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    electionPhase === "VOTING" && setView("voting-booth")
                  }
                  disabled={electionPhase !== "VOTING"}
                  className={cn(
                    "px-6 py-3 rounded-xl font-black",
                    electionPhase === "VOTING"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-400",
                  )}
                >
                  <Vote className="inline-block mr-2" />{" "}
                  {electionPhase === "VOTING"
                    ? t("cast_ballot")
                    : t("voting_inactive")}
                </button>
                <button
                  onClick={() => setView("receipt-verification")}
                  className="px-6 py-3 rounded-xl font-black border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400"
                >
                  <Search size={14} className="inline-block mr-2" />
                  Verify Receipt
                </button>
                <div className="text-sm text-slate-500">
                  <Clock size={16} /> {t("polls_close_in_short")}
                </div>
              </div>
            )}
          </div>
        </div>

        {candidatePreview.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
                  Approved candidates
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Ready for the ballot
                </h3>
              </div>
              {isVoter && electionPhase === "VOTING" && (
                <button
                  onClick={() => setView("voting-booth")}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  Open voting booth
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {candidatePreview.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl">
                      {candidate.symbol}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">
                        {candidate.fullName}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 truncate">
                        {candidate.party}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={() => setView("help")}
            className="text-xs text-slate-500 underline"
          >
            {t("learn_more")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
