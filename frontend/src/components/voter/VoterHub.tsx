import React from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Vote,
  CheckCircle2,
  Clock,
  Search,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";
import { fetchJson } from "../../services/api/client";

export function VoterHub({
  user,
  setView,
  t,
  electionPhase,
  currentElectionId,
  currentElectionTitle,
  currentElectionStatus,
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
  const [resolvedElectionId, setResolvedElectionId] = useState<string | null>(
    currentElectionId ?? null,
  );
  const [resolvedElectionTitle, setResolvedElectionTitle] = useState<
    string | null
  >(currentElectionTitle ?? null);
  const [resolvedElectionStatus, setResolvedElectionStatus] = useState<
    string | null
  >(currentElectionStatus ?? null);
  const [votingCandidate, setVotingCandidate] = useState<any | null>(null);
  const [votingKey, setVotingKey] = useState("");
  const [castingVote, setCastingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteNotice, setVoteNotice] = useState<string | null>(null);
  const isVoter = role === "VOTER";

  useEffect(() => {
    if (currentElectionId) {
      setResolvedElectionId(currentElectionId);
    }

    if (currentElectionTitle) {
      setResolvedElectionTitle(currentElectionTitle);
    }

    if (currentElectionStatus) {
      setResolvedElectionStatus(currentElectionStatus);
    }
  }, [currentElectionId, currentElectionTitle, currentElectionStatus]);

  const hydrateElectionDetails = async (electionId: string) => {
    if (!token || !electionId) {
      return null;
    }

    try {
      const response = await fetchJson<{ data: any }>(
        `/api/v1/elections/${encodeURIComponent(electionId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const election = response?.data ?? null;
      if (election?.id) {
        setResolvedElectionId(election.id);
        setResolvedElectionTitle(election.title ?? null);
        setResolvedElectionStatus(election.status ?? null);
      }

      return election;
    } catch {
      return null;
    }
  };

  const loadCurrentOpenElection = async () => {
    if (!token) {
      return null;
    }

    try {
      const response = await fetchJson<{ data: any }>(
        "/api/v1/elections/current/open",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const election = response?.data ?? null;
      if (election?.id) {
        setResolvedElectionId(election.id);
        setResolvedElectionTitle(election.title ?? null);
        setResolvedElectionStatus(election.status ?? null);
      }

      return election;
    } catch {
      return null;
    }
  };

  const resolveActiveElection = async () => {
    if (!token) {
      return null;
    }

    const currentOpenElection = await loadCurrentOpenElection();
    if (currentOpenElection?.id) {
      return currentOpenElection;
    }

    try {
      const response = await fetchJson<{ data: any[] }>(
        "/api/v1/elections?page=1&limit=100&status=VOTING_OPEN",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const openElection = Array.isArray(response?.data)
        ? (response.data[0] ?? null)
        : null;

      if (openElection?.id) {
        setResolvedElectionId(openElection.id);
        setResolvedElectionTitle(openElection.title ?? null);
        setResolvedElectionStatus(openElection.status ?? null);
        return openElection;
      }
    } catch {
      // fall through to broader lookup
    }

    try {
      const response = await fetchJson<{ data: any[] }>(
        "/api/v1/elections?page=1&limit=100",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const fallbackElection =
        (Array.isArray(response?.data)
          ? (response.data.find(
              (election) => election.status === "VOTING_OPEN",
            ) ??
            response.data.find(
              (election) =>
                election.status !== "RESULTS_DECLARED" &&
                election.status !== "CANCELLED",
            ))
          : null) ?? null;

      if (fallbackElection?.id) {
        setResolvedElectionId(fallbackElection.id);
        setResolvedElectionTitle(fallbackElection.title ?? null);
        setResolvedElectionStatus(fallbackElection.status ?? null);
      }

      return fallbackElection;
    } catch {
      return null;
    }
  };

  const loadVotingStatus = async () => {
    if (!isVoter || !token) {
      return;
    }

    try {
      const response = await fetchJson<{ data: any }>("/api/v1/voting/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const status = response?.data ?? {};
      setVotingStatus({
        hasVoted: Boolean(status.hasVoted),
        receiptHash: status.receiptHash ?? user?.receiptToken ?? null,
        castAt: status.castAt ?? null,
      });
    } catch {
      setVotingStatus((prev) => ({
        ...prev,
        hasVoted: Boolean(user?.hasVoted),
        receiptHash: user?.receiptToken ?? prev.receiptHash,
      }));
    }
  };

  const loadCandidates = async () => {
    if (!token) {
      setCandidatePreview([]);
      return;
    }

    let electionId = currentElectionId ?? resolvedElectionId;
    let electionTitle = currentElectionTitle ?? resolvedElectionTitle;
    let electionStatus = currentElectionStatus ?? resolvedElectionStatus;

    if (!electionId) {
      const activeElection = await resolveActiveElection();
      electionId = activeElection?.id ?? null;
      electionTitle = activeElection?.title ?? electionTitle ?? null;
      electionStatus = activeElection?.status ?? electionStatus ?? null;
    }

    try {
      const response = await fetchJson<{ data: any[] }>(
        electionId
          ? `/api/v1/candidates?page=1&limit=100&electionId=${encodeURIComponent(electionId)}&status=APPROVED`
          : "/api/v1/candidates?page=1&limit=100&status=APPROVED",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const firstCandidateElectionId =
        !electionId && Array.isArray(response.data)
          ? (response.data.find((candidate) => candidate?.electionId)
              ?.electionId ?? null)
          : null;

      if (!electionId && firstCandidateElectionId) {
        electionId = firstCandidateElectionId;
        await hydrateElectionDetails(firstCandidateElectionId);
      }

      setCandidatePreview(
        Array.isArray(response.data)
          ? response.data.map((candidate) => ({
              id: candidate.id,
              fullName: candidate.fullName,
              party: candidate.party,
              symbol: candidate.symbol || candidate.partyCode || "🗳️",
              electionId: candidate.electionId ?? null,
              votes: Number(candidate.votes ?? 0),
            }))
          : [],
      );
      setResolvedElectionId(electionId);
      setResolvedElectionTitle(electionTitle);
      setResolvedElectionStatus(electionStatus);
    } catch {
      setCandidatePreview([]);
    }
  };

  const closeVoteModal = () => {
    setVotingCandidate(null);
    setVotingKey("");
    setVoteError(null);
    setVoteNotice(null);
  };

  const submitVote = async () => {
    if (!votingCandidate) {
      return;
    }

    if (!votingKey.trim()) {
      setVoteError("Enter the voting key before submitting.");
      return;
    }

    setCastingVote(true);
    setVoteError(null);
    setVoteNotice(null);

    try {
      const response = await fetchJson<{ data: { receiptHash: string } }>(
        "/api/v1/voting/cast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            electionId: currentElectionId ?? resolvedElectionId,
            candidateId: votingCandidate.id,
            tokenHash: votingKey.trim(),
          }),
        },
      );

      const receiptHash = response?.data?.receiptHash ?? null;
      if (receiptHash) {
        sessionStorage.setItem("nehs_last_receipt_hash", receiptHash);
      }

      try {
        localStorage.removeItem("nehs_pending_voting_token");
      } catch {
        // ignore storage failures
      }

      setUser((prev: any) => ({
        ...prev,
        hasVoted: true,
        receiptToken: receiptHash,
      }));

      setVotingStatus((prev) => ({
        ...prev,
        hasVoted: true,
        receiptHash,
        castAt: new Date().toISOString(),
      }));
      setVoteNotice("Vote recorded successfully.");
      setVotingKey("");
      await Promise.all([loadVotingStatus(), loadCandidates()]);
    } catch (error) {
      const body = (error as any)?.body;
      const message =
        typeof body?.message === "string"
          ? body.message
          : typeof (error as any)?.message === "string"
            ? (error as any).message
            : "Failed to cast vote";
      setVoteError(message);
    } finally {
      setCastingVote(false);
    }
  };

  useEffect(() => {
    void loadVotingStatus();
  }, [isVoter, token, user]);

  useEffect(() => {
    void loadCandidates();
  }, [
    currentElectionId,
    token,
    resolvedElectionId,
    resolvedElectionTitle,
    resolvedElectionStatus,
  ]);

  useEffect(() => {
    if (currentElectionId || resolvedElectionId) {
      return;
    }

    void resolveActiveElection();
  }, [currentElectionId, resolvedElectionId, token]);

  useEffect(() => {
    if (resolvedElectionId || !candidatePreview.length) {
      return;
    }

    const candidateElectionId = candidatePreview.find(
      (candidate) => candidate?.electionId,
    )?.electionId;

    if (candidateElectionId) {
      void hydrateElectionDetails(candidateElectionId);
    }
  }, [candidatePreview, resolvedElectionId, token]);

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
        <p className="text-sm text-slate-500 mb-6">
          Choose a candidate, verify with your voting key, and submit the
          ballot.
        </p>

        <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
                Current election
              </p>
              <p className="font-black text-slate-900">
                {resolvedElectionTitle ??
                  currentElectionTitle ??
                  currentElectionId ??
                  "No active election"}
              </p>
              {(resolvedElectionStatus ?? currentElectionStatus) && (
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-[0.2em] font-semibold">
                  Status:{" "}
                  {(resolvedElectionStatus ??
                    currentElectionStatus)!.replaceAll("_", " ")}
                </p>
              )}
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
                  Vote directly from the command center
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {candidatePreview.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shrink-0">
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
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-400 font-black">
                    <span>Approved</span>
                    <span>{candidate.votes ?? 0} votes</span>
                  </div>
                  <button
                    onClick={() => {
                      if (electionPhase !== "VOTING" || !isVoter) return;
                      setVotingCandidate(candidate);
                      setVoteError(null);
                      setVoteNotice(null);
                    }}
                    disabled={
                      electionPhase !== "VOTING" || votingStatus.hasVoted
                    }
                    className={cn(
                      "mt-auto w-full rounded-2xl px-4 py-3 font-black uppercase tracking-[0.25em] text-[10px] inline-flex items-center justify-center gap-2 transition-all",
                      electionPhase === "VOTING" && !votingStatus.hasVoted
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    <Vote size={14} />
                    {votingStatus.hasVoted ? "Vote recorded" : "Vote now"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {votingCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
                    Confirm ballot
                  </p>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">
                    {votingCandidate.fullName}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Enter the voting key issued by staff to cast this ballot.
                  </p>
                </div>
                <button
                  onClick={closeVoteModal}
                  className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 mb-4 flex items-center gap-3">
                <ShieldCheck size={18} className="text-slate-900" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Key required
                  </p>
                  <p className="text-sm text-slate-700">
                    The server validates the key before the vote is counted.
                  </p>
                </div>
              </div>

              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                Voting key
              </label>
              <input
                autoFocus
                type="password"
                value={votingKey}
                onChange={(event) => setVotingKey(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 font-mono outline-none focus:border-slate-900"
                placeholder="Enter key from staff"
              />

              {voteError && (
                <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-rose-700 text-sm font-semibold">
                  {voteError}
                </div>
              )}
              {voteNotice && (
                <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-700 text-sm font-semibold">
                  {voteNotice}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={closeVoteModal}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black uppercase tracking-[0.2em] text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={submitVote}
                  disabled={castingVote}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-60"
                >
                  {castingVote ? "Submitting..." : "Submit vote"}
                </button>
              </div>
            </motion.div>
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
