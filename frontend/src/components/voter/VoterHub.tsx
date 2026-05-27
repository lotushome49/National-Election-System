import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
// demo voting state removed — voter flows require real backend
import { getScopeAccessModel } from "../../utils/scope";
import { fetchJson } from "../../services/api/client";

function statusToPhase(status?: string | null) {
  if (status === "VOTING_OPEN") return "VOTING";
  if (
    status === "VOTING_CLOSED" ||
    status === "COUNTING" ||
    status === "RESULTS_DECLARED"
  ) {
    return "CLOSED";
  }
  return null;
}

function hasJwtAccessToken(token: unknown) {
  return typeof token === "string" && token.split(".").length === 3;
}

function mapCandidate(candidate: any) {
  return {
    id: candidate.id,
    fullName: candidate.fullName,
    party: candidate.party,
    symbol: candidate.symbol || candidate.partyCode || "BALLOT",
    electionId: candidate.electionId ?? null,
    votes: Number(candidate.votes ?? 0),
  };
}

export function VoterHub({
  user,
  setUser,
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
  const [uniqueVoterIdInput, setUniqueVoterIdInput] = useState("");
  const [accessVerified, setAccessVerified] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  const [castingVote, setCastingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteNotice, setVoteNotice] = useState<string | null>(null);
  const [candidateListVisible, setCandidateListVisible] = useState(false);
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
    if (!hasJwtAccessToken(token) || !electionId) {
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
    try {
      const response = await fetchJson<{ data: any }>(
        "/api/v1/elections/current/open",
        {},
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
    const currentOpenElection = await loadCurrentOpenElection();
    if (currentOpenElection?.id) {
      return currentOpenElection;
    }

    try {
      const response = await fetchJson<{ data: any[] }>(
        "/api/v1/elections?page=1&limit=100&status=VOTING_OPEN",
        {},
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
        {},
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
    if (!isVoter || !hasJwtAccessToken(token)) {
      return;
    }

    // proceed with real backend voting status lookup

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

      if (status.hasVoted) {
        setAccessVerified(true);
      }
    } catch {
      setVotingStatus((prev) => ({
        ...prev,
        hasVoted: Boolean(user?.hasVoted),
        receiptHash: user?.receiptToken ?? prev.receiptHash,
      }));
    }
  };

  const verifyVoteAccess = async () => {
    if (!hasJwtAccessToken(token)) {
      setVoteError("Please log in again before verifying access.");
      return;
    }

    const uniqueVoterId = uniqueVoterIdInput.trim();
    if (!uniqueVoterId) {
      setVoteError("Enter your unique voter ID before viewing candidates.");
      return;
    }

    setAccessLoading(true);
    setVoteError(null);
    setAccessNotice(null);

    try {
      const response = await fetchJson<{ data: any }>(
        "/api/v1/vote/verify-access",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uniqueVoterId }),
        },
      );

      const result = response?.data ?? {};
      setAccessVerified(true);
      setCandidateListVisible(true);
      setAccessNotice(
        result?.fullName
          ? `Access verified for ${result.fullName}.`
          : "Voting access verified.",
      );
      await loadCandidates();
    } catch (error) {
      const body = (error as any)?.body;
      const message =
        typeof body?.message === "string"
          ? body.message
          : typeof (error as any)?.message === "string"
            ? (error as any).message
            : "Unable to verify voting access";
      setAccessVerified(false);
      setCandidateListVisible(false);
      setAccessNotice(null);
      setVoteError(message);
    } finally {
      setAccessLoading(false);
    }
  };

  const loadCandidates = async () => {
    if (!accessVerified && !votingStatus.hasVoted) {
      return;
    }

    try {
      let electionId = currentElectionId ?? resolvedElectionId;
      let electionTitle = currentElectionTitle ?? resolvedElectionTitle;
      let electionStatus = currentElectionStatus ?? resolvedElectionStatus;

      if (!electionId) {
        const activeElection = await resolveActiveElection();
        electionId = activeElection?.id ?? null;
        electionTitle = activeElection?.title ?? electionTitle ?? null;
        electionStatus = activeElection?.status ?? electionStatus ?? null;
      }

      const response = await fetchJson<{ data: any[] }>(
        electionId
          ? `/api/v1/candidates/public?page=1&limit=100&electionId=${encodeURIComponent(electionId)}&status=APPROVED`
          : "/api/v1/candidates/public?page=1&limit=100&status=APPROVED",
        {},
      );

      const mappedCandidates = Array.isArray(response.data)
        ? response.data.map((candidate) => ({
            id: candidate.id,
            fullName: candidate.fullName,
            party: candidate.party,
            symbol: candidate.symbol || candidate.partyCode || "🗳️",
            electionId: candidate.electionId ?? null,
            voteCount: Number(candidate.voteCount ?? 0),
          }))
        : [];

      setCandidatePreview(mappedCandidates);
      setResolvedElectionId(electionId);
      setResolvedElectionTitle(electionTitle);
      setResolvedElectionStatus(electionStatus);
    } catch {
      setCandidatePreview([]);
    }
  };

  const closeVoteModal = () => {
    setVotingCandidate(null);
    setVoteError(null);
    setVoteNotice(null);
  };

  const submitVote = async () => {
    if (!votingCandidate) {
      return;
    }

    const uniqueVoterId = uniqueVoterIdInput.trim();
    if (!uniqueVoterId) {
      setVoteError("Verify your unique voter ID before submitting.");
      return;
    }

    if (!hasJwtAccessToken(token)) {
      setVoteError(
        "Please log in again. Voting requires your login access token, not the voting token.",
      );
      return;
    }

    setCastingVote(true);
    setVoteError(null);
    setVoteNotice(null);

    try {
      const response = await fetchJson<{ data: { receiptHash: string } }>(
        "/api/v1/vote/cast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            electionId: currentElectionId ?? resolvedElectionId,
            candidateId: votingCandidate.id,
            uniqueVoterId,
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

      setUser?.((prev: any) => ({
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
      setAccessVerified(true);
      setCandidateListVisible(false);
      await loadVotingStatus();
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
    if (accessVerified) {
      void loadCandidates();
    }
  }, [
    accessVerified,
    currentElectionId,
    token,
    resolvedElectionId,
    resolvedElectionTitle,
    resolvedElectionStatus,
  ]);

  useEffect(() => {
    if (currentElectionId || resolvedElectionId || !hasJwtAccessToken(token)) {
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
  const displayElectionPhase =
    statusToPhase(resolvedElectionStatus ?? currentElectionStatus) ??
    electionPhase;
  const votingActive = displayElectionPhase === "VOTING";
  const electionLabel =
    resolvedElectionTitle ?? currentElectionTitle ?? currentElectionId ?? null;
  const electionStatusLabel =
    resolvedElectionStatus ??
    currentElectionStatus ??
    (votingActive ? "VOTING_OPEN" : null);

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
            displayElectionPhase === "VOTING"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              displayElectionPhase === "VOTING"
                ? "bg-emerald-500"
                : "bg-blue-500",
            )}
          />
          <span className="text-xs font-black uppercase tracking-wide">
            {t(`phase_${displayElectionPhase.toLowerCase()}`)}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-8 lg:p-10 rounded-3xl shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr] lg:items-start mb-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-white">
                <ShieldCheck size={12} /> {t("secure_session")}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em]",
                  votingActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                <CheckCircle2 size={12} />
                {votingActive ? t("voting_open") : t("election_closed")}
              </span>
            </div>

            <div>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                {t("voter_hub_title")}
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                Open the candidate list, then choose a candidate and enter your
                unique voter ID to cast the ballot.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
              Current election
            </p>
            <p className="mt-2 font-black text-slate-900 leading-tight">
              {electionLabel ??
                (votingActive ? "Voting is open" : "No active election")}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] font-semibold text-slate-500">
              {electionStatusLabel
                ? electionStatusLabel.replaceAll("_", " ")
                : t("voting_open")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
              {t("unique_voter_id")}
            </p>
            <p className="mt-3 font-mono text-sm text-slate-900 break-all">
              {user?.uniqueVoterId ?? user?.voterId ?? user?.id ?? "Pending"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
              {t("voting_availability")}
            </p>
            <p className="mt-3 font-black text-slate-900">
              {votingActive ? t("open") : t("closed")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
              {t("registration_status")}
            </p>
            <p className="mt-3 font-black text-slate-900">
              {isVoter || user?.registered
                ? t("registered")
                : t("not_registered")}
            </p>
          </div>
        </div>

        {isVoter && !votingStatus.hasVoted && (
          <div className="mb-8 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block mb-2">
                  Unique voter ID
                </label>
                <input
                  value={uniqueVoterIdInput}
                  onChange={(event) =>
                    setUniqueVoterIdInput(event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-slate-900 focus:bg-white"
                  placeholder="Enter your unique voter ID"
                />
              </div>
              <button
                onClick={verifyVoteAccess}
                disabled={accessLoading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white disabled:opacity-60"
              >
                {accessLoading ? "Verifying..." : "Verify access"}
              </button>
            </div>
            {accessNotice && (
              <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-700 text-sm font-semibold">
                {accessNotice}
              </div>
            )}
          </div>
        )}

        {!isVoter && (
          <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <Users className="text-slate-500" />
              <div>
                <p className="font-black text-slate-900">Staff access</p>
                <p className="text-xs text-slate-500">
                  Use the voter registry to verify citizens and issue unique
                  voting IDs.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 lg:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">
                Candidates
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">
                {candidateListVisible ? "Candidate list" : "Hidden"}
              </h3>
            </div>
            <button
              onClick={() => {
                if (!accessVerified && !votingStatus.hasVoted) {
                  setVoteError(
                    "Verify your unique voter ID before viewing candidates.",
                  );
                  return;
                }
                setCandidateListVisible((prev) => !prev);
              }}
              disabled={votingStatus.hasVoted}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px]"
            >
              <Vote className="inline-block mr-2" />
              {candidateListVisible ? "Hide candidates" : "View candidates"}
            </button>
          </div>

          <AnimatePresence>
            {candidateListVisible && candidatePreview.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-8 border-t border-slate-100 pt-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {candidatePreview.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">
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
                        <span>{candidate.voteCount ?? 0} votes</span>
                      </div>
                      <button
                        onClick={() => {
                          if (displayElectionPhase !== "VOTING" || !isVoter)
                            return;
                          setVotingCandidate(candidate);
                          setVoteError(null);
                          setVoteNotice(null);
                        }}
                        disabled={
                          displayElectionPhase !== "VOTING" ||
                          votingStatus.hasVoted
                        }
                        className={cn(
                          "mt-auto w-full rounded-2xl px-4 py-3 font-black uppercase tracking-[0.25em] text-[10px] inline-flex items-center justify-center gap-2 transition-all",
                          displayElectionPhase === "VOTING" &&
                            !votingStatus.hasVoted
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed",
                        )}
                      >
                        <Vote size={14} />
                        {votingStatus.hasVoted ? "Vote recorded" : "Vote"}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {candidateListVisible && candidatePreview.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-8 border-t border-slate-100 pt-6"
              >
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
                  <p className="text-sm font-black text-slate-900">
                    No candidates loaded yet.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Try again in a moment, or open the current election first.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                    Verified voter
                  </p>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">
                    {votingCandidate.fullName}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Your unique voter ID is checked before the ballot is cast.
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
                    ID required
                  </p>
                  <p className="text-sm text-slate-700">
                    The server validates the ID before the vote is counted.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-mono text-slate-900">
                {uniqueVoterIdInput ||
                  user?.uniqueVoterId ||
                  user?.voterId ||
                  "Pending"}
              </div>

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
