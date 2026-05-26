import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  Fingerprint,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { CandidateDetailModal } from "../candidates/CandidateDetailModal";
import { fetchJson } from "../../services/api/client";
import type { Candidate } from "../../types/election";
import {
  persistDemoVoteState,
  readDemoUserState,
  readDemoVoterAuth,
} from "../../utils/demoVotingState";

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

function hasJwtAccessToken(token: unknown) {
  return typeof token === "string" && token.split(".").length === 3;
}

function isDemoAccessToken(token: unknown) {
  if (!hasJwtAccessToken(token)) return false;

  try {
    const payloadPart = String(token).split(".")[1];
    if (!payloadPart) return false;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return Boolean(payload?.demo);
  } catch {
    return false;
  }
}

function mapBallotCandidate(candidate: any): Candidate {
  return {
    id: candidate.id,
    name: candidate.fullName,
    party: candidate.party,
    symbol: candidate.symbol || candidate.partyCode || "BALLOT",
    photoUrl: candidate.photoUrl,
    bio: candidate.bio,
    manifesto: candidate.manifesto,
    platform: candidate.manifesto || candidate.party,
    votes: Number(candidate.votes ?? 0),
  };
}

export function VotingBoothView({
  token,
  setView,
  setUser,
  t,
  currentElectionId,
}: any) {
  const isDemoSession = useMemo(() => {
    if (isDemoAccessToken(token)) return true;

    try {
      return Boolean(readDemoVoterAuth() || readDemoUserState());
    } catch {
      return false;
    }
  }, [token]);

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [expandedCandidate, setExpandedCandidate] = useState<Candidate | null>(
    null,
  );
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [votingToken, setVotingToken] = useState("");
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const [resolvedElectionId, setResolvedElectionId] = useState<string | null>(
    currentElectionId ?? null,
  );

  useEffect(() => {
    if (currentElectionId) {
      setResolvedElectionId(currentElectionId);
    }
  }, [currentElectionId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nehs_pending_voting_token");
      if (!stored) return;

      const parsed = JSON.parse(stored) as {
        token?: string;
        electionId?: string | null;
      };

      if (
        parsed?.token &&
        (!parsed.electionId || parsed.electionId === resolvedElectionId)
      ) {
        setVotingToken(parsed.token);
      }
    } catch {
      // ignore malformed localStorage data
    }
  }, [resolvedElectionId]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selected) ?? null,
    [candidates, selected],
  );

  useEffect(() => {
    if (step !== 1) {
      return;
    }

    if (isDemoSession) {
      try {
        console.debug(
          "[VotingBooth] demo session detected for candidate load",
          {
            hasToken: Boolean(token),
            tokenMasked: token ? `***${String(token).slice(-6)}` : null,
            isDemoToken: isDemoAccessToken(token),
          },
        );
      } catch {
        // ignore
      }

      const demoCandidates: Candidate[] = [
        {
          id: "cand-demo-1",
          name: "Alemu Tesfaye",
          party: "Unity Party",
          symbol: "★",
          photoUrl: "",
          bio: "Demo candidate for local voting flow.",
          manifesto: "Stable services and transparent governance.",
          platform: "Stable services and transparent governance.",
          votes: 0,
        },
        {
          id: "cand-demo-2",
          name: "Saron Bekele",
          party: "Civic Alliance",
          symbol: "◆",
          photoUrl: "",
          bio: "Demo candidate for local voting flow.",
          manifesto: "Citizen-first delivery and accountability.",
          platform: "Citizen-first delivery and accountability.",
          votes: 0,
        },
      ];

      setCandidates(demoCandidates);
      setCandidateError(null);
      setLoadingCandidates(false);
      return;
    }

    if (!hasJwtAccessToken(token)) {
      setCandidates([]);
      setCandidateError(
        "Please log in again. Voting requires the access token from login, not the voting token.",
      );
      return;
    }
    try {
      console.debug("[VotingBooth] loadCandidates token state", {
        hasToken: Boolean(token),
        looksLikeJwt: hasJwtAccessToken(token),
        isDemo: isDemoAccessToken(token),
        tokenMasked: token ? `***${String(token).slice(-6)}` : null,
      });
    } catch {
      // ignore
    }

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      setCandidateError(null);
      try {
        let electionId = resolvedElectionId;
        if (!electionId) {
          const ballot = await fetchJson<{
            data: { election?: { id?: string }; candidates?: any[] };
          }>("/api/v1/voting/active-ballot", {
            headers: { Authorization: `Bearer ${token}` },
          });

          electionId = ballot?.data?.election?.id ?? null;
          if (electionId) {
            setResolvedElectionId(electionId);
          }

          const ballotCandidates = Array.isArray(ballot?.data?.candidates)
            ? ballot.data.candidates
            : [];

          if (ballotCandidates.length > 0) {
            setCandidates(
              ballotCandidates
                .map(mapBallotCandidate)
                .sort((left, right) => left.name.localeCompare(right.name)),
            );
            return;
          }

          const openElection = await fetchJson<{ data: { id?: string } }>(
            "/api/v1/elections/current/open",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          electionId = openElection?.data?.id ?? null;
          if (electionId) {
            setResolvedElectionId(electionId);
          }
        }

        if (!electionId) {
          setCandidates([]);
          setCandidateError("No active election is available for voting.");
          return;
        }

        const response = await fetchJson<{ data: Candidate[] }>(
          `/api/v1/candidates?page=1&limit=100&electionId=${encodeURIComponent(electionId)}&status=APPROVED`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const payload = Array.isArray(response?.data) ? response.data : [];
        setCandidates(
          payload
            .map((candidate: any) => ({
              id: candidate.id,
              name: candidate.fullName,
              party: candidate.party,
              symbol: candidate.symbol || candidate.partyCode || "🗳️",
              photoUrl: candidate.photoUrl,
              bio: candidate.bio,
              manifesto: candidate.manifesto,
              platform: candidate.manifesto || candidate.party,
              votes: Number(candidate.votes ?? 0),
            }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      } catch (error) {
        setCandidates([]);
        setCandidateError(
          getErrorMessage(error, "Failed to load candidates for this election"),
        );
      } finally {
        setLoadingCandidates(false);
      }
    };

    void loadCandidates();
  }, [resolvedElectionId, step, token]);

  const handleCastVote = async () => {
    const electionId = resolvedElectionId ?? currentElectionId;
    if (!electionId) {
      alert("No active election is available.");
      return;
    }

    if (!selected) {
      alert("Please select a candidate first.");
      return;
    }

    if (!votingToken.trim()) {
      alert("Enter your unique voting ID.");
      return;
    }

    if (!hasJwtAccessToken(token) && !isDemoSession) {
      alert(
        "Please log in again. The vote request must use your login access token, not the voting token.",
      );
      return;
    }

    if (isDemoSession) {
      try {
        console.debug("[VotingBooth] demo vote cast locally", {
          selected,
          electionId,
          tokenMasked: token ? `***${String(token).slice(-6)}` : null,
          hasStoredDemoSession: Boolean(localStorage.getItem("demoVoterAuth")),
        });
      } catch {
        // ignore
      }

      const nextReceiptHash = `demo-receipt-${Date.now()}-${votingToken.trim()}`;
      const castAt = new Date().toISOString();
      setReceiptHash(nextReceiptHash);
      if (nextReceiptHash) {
        sessionStorage.setItem("nehs_last_receipt_hash", nextReceiptHash);
        try {
          localStorage.removeItem("nehs_pending_voting_token");
          persistDemoVoteState({
            receiptHash: nextReceiptHash,
            castAt,
            candidateId: selected,
            electionId: electionId,
          });
        } catch {
          // ignore storage failures
        }
      }
      setUser((prev: any) => ({
        ...prev,
        hasVoted: true,
        receiptToken: nextReceiptHash,
        castAt,
      }));
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      try {
        console.debug("[VotingBooth] casting vote", {
          url: "/api/v1/voting/cast",
          tokenMasked: token ? `***${String(token).slice(-6)}` : null,
          isDemo: isDemoAccessToken(token),
          votingTokenPreview: votingToken
            ? String(votingToken).slice(-8)
            : null,
        });
      } catch {}
      const resp = await fetchJson<{ data: { receiptHash: string } }>(
        "/api/v1/voting/cast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            electionId,
            candidateId: selected,
            tokenHash: votingToken.trim(),
          }),
        },
      );
      const nextReceiptHash = resp?.data?.receiptHash ?? null;

      setReceiptHash(nextReceiptHash);
      if (nextReceiptHash) {
        sessionStorage.setItem("nehs_last_receipt_hash", nextReceiptHash);
        try {
          localStorage.removeItem("nehs_pending_voting_token");
        } catch {
          // ignore storage failures
        }
      }
      setUser((prev: any) => ({
        ...prev,
        hasVoted: true,
        receiptToken: nextReceiptHash,
      }));
      setStep(3);
    } catch (e: any) {
      alert(getErrorMessage(e, "Failed to cast vote"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      {step === 1 && (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <ShieldCheck size={14} className="text-slate-900" />
                {t("encrypted_ballot_active")}
              </div>
              <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
                {t("select_candidate")}
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-wide">
                {t("step_2_desc")}
              </p>
            </div>

            <div className="flex flex-col lg:items-end gap-6">
              <div className="px-6 py-3 bg-slate-900 text-white rounded-[1.5rem] flex items-center gap-4 shadow-2xl shadow-slate-200 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  {t("terminal_secured")}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-12 h-1.5 rounded-full transition-all duration-500",
                      i === step ? "bg-slate-900 w-20" : "bg-slate-200",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {candidateError ? (
            <div className="p-8 rounded-[2rem] bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
              {candidateError}
            </div>
          ) : loadingCandidates ? (
            <div className="p-20 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] animate-pulse">
              Loading candidates
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold">
              No approved candidates are available for this election yet.
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {candidates.map((c) => (
                <motion.div
                  key={c.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="relative"
                >
                  <motion.button
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      "w-full text-left p-10 rounded-[3rem] border transition-all duration-500 relative overflow-hidden group",
                      selected === c.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]"
                        : "bg-white border-slate-100 hover:border-slate-300 shadow-sm",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-30 transition-opacity",
                        selected === c.id ? "bg-white/20" : "bg-slate-100",
                      )}
                    />

                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-20 h-20 shrink-0 relative">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className="w-full h-full object-cover rounded-2xl shadow-xl border-2 border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-4xl bg-slate-50 w-full h-full flex items-center justify-center rounded-2xl border border-slate-100 font-display font-black">
                            {c.symbol}
                          </div>
                        )}
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 p-1 rounded-lg shadow-sm text-[10px] font-black border",
                            selected === c.id
                              ? "bg-white text-slate-900 border-white/20"
                              : "bg-white text-slate-400 border-slate-50",
                          )}
                        >
                          {c.symbol}
                        </div>
                      </div>
                      <div>
                        <h4
                          className={cn(
                            "font-display font-black text-2xl tracking-tighter uppercase leading-none mb-1",
                            selected === c.id ? "text-white" : "text-slate-900",
                          )}
                        >
                          {c.name}
                        </h4>
                        <p
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            selected === c.id
                              ? "text-white/40"
                              : "text-slate-400",
                          )}
                        >
                          {c.party}
                        </p>
                      </div>
                    </div>
                    {selected === c.id && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-10 left-10 p-2 bg-white text-slate-900 rounded-full shadow-xl z-20"
                      >
                        <CheckCircle2 size={24} />
                      </motion.div>
                    )}
                  </motion.button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCandidate(c);
                    }}
                    className="absolute bottom-4 right-4 p-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                  >
                    <Search size={14} />
                    {t("view_details")}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          <AnimatePresence>
            {expandedCandidate && (
              <CandidateDetailModal
                candidate={expandedCandidate}
                onClose={() => setExpandedCandidate(null)}
                t={t}
              />
            )}
          </AnimatePresence>

          <div className="mt-20 flex flex-col items-center">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <button
                disabled={!selected}
                onClick={() => setStep(2)}
                className="bg-slate-900 text-white px-16 py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter flex items-center gap-4 group"
              >
                {t("review_choice")}
                <ChevronRight
                  size={28}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
            <div className="mt-10 flex items-center gap-4 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100">
              <ShieldCheck size={14} />
              {t("privacy_notice_short")}
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <ShieldCheck size={14} className="text-slate-900" />
                {t("integrity_check_active")}
              </div>
              <h3 className="text-4xl font-display font-black tracking-tighter text-slate-900 leading-none uppercase">
                {t("review_choice")}
              </h3>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 h-1.5 rounded-full transition-all duration-500",
                    i === step ? "bg-slate-900 w-20" : "bg-slate-200",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="bg-white p-16 lg:p-20 rounded-[4rem] shadow-2xl text-center border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />

            <h2 className="text-4xl lg:text-5xl font-display font-black mb-6 tracking-tighter text-slate-900 uppercase">
              {t("step_3_title")}
            </h2>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mb-12 max-w-sm mx-auto">
              {t("step_3_desc")}
            </p>

            <div className="p-12 bg-slate-900 text-white rounded-[3rem] mb-8 shadow-2xl shadow-slate-300 border border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-6xl mb-6 bg-white/10 w-24 h-24 flex items-center justify-center rounded-[2rem] border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                  {selectedCandidate?.symbol}
                </div>
                <div className="text-3xl font-display font-black tracking-tighter uppercase mb-2">
                  {selectedCandidate?.name}
                </div>
                <div className="text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">
                  {selectedCandidate?.party}
                </div>
              </div>
              <Fingerprint
                size={200}
                className="absolute -right-16 -bottom-16 opacity-5"
              />
            </div>

            <div className="space-y-1 mb-12 text-left">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                Unique Voting ID
              </label>
              <input
                value={votingToken}
                onChange={(event) => setVotingToken(event.target.value)}
                placeholder="Enter your unique voting ID"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-mono text-slate-900 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest px-2">
                This ID is required once and will be verified by the backend.
              </p>
            </div>

            <div className="bg-red-50 p-6 rounded-3xl mb-12 flex items-start gap-4 text-left border border-red-100">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest leading-relaxed">
                {t("inst_2")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCastVote}
                disabled={submitting}
                className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {submitting && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? t("registering_ballot") : t("confirm_anchoring")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto text-center p-16 lg:p-20 bg-white rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />

          <div className="w-28 h-28 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-100 animate-in zoom-in spin-in-6 duration-700">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-black mb-6 tracking-tighter text-slate-900 uppercase">
            {t("vote_success")}
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mb-14 max-w-sm mx-auto leading-relaxed">
            {t("vote_success_desc")}
          </p>

          <button
            onClick={() => setView("voter-hub")}
            className="bg-slate-900 text-white w-full py-8 rounded-[2.5rem] font-black text-xl uppercase tracking-tighter shadow-2xl shadow-slate-300 hover:bg-slate-800 active:scale-95 transition-all"
          >
            {t("return_terminal")}
          </button>

          <button
            onClick={() => setView("receipt-verification")}
            className="mt-4 w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] bg-emerald-50 text-emerald-700 border border-emerald-100"
          >
            Verify Receipt
          </button>

          <div className="mt-16 p-8 bg-slate-50 rounded-3xl font-mono text-[10px] text-slate-400 text-left border border-slate-100 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <div className="font-black text-slate-900 uppercase tracking-widest">
                {t("receipt_hash")} (SHA-256)
              </div>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <div className="break-all opacity-60 font-medium leading-relaxed group-hover:opacity-100 transition-opacity">
              {receiptHash || "Receipt hash unavailable"}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
