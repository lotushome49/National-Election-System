import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";

export function AdminOpenElectionView({ token, setView, t }: any) {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadElections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<{ data: any[] }>(
        "/api/v1/elections?page=1&limit=100",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const loadedElections = Array.isArray(res.data) ? res.data : [];
      const approvedCandidatesRes = await fetchJson<{ data: any[] }>(
        "/api/v1/candidates?page=1&limit=1000&status=APPROVED",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const approvedCandidates = Array.isArray(approvedCandidatesRes.data)
        ? approvedCandidatesRes.data
        : [];
      const approvedCountByElection = approvedCandidates.reduce(
        (counts, candidate) => {
          if (!candidate?.electionId) return counts;
          counts.set(
            candidate.electionId,
            (counts.get(candidate.electionId) ?? 0) + 1,
          );
          return counts;
        },
        new Map<string, number>(),
      );

      const electionsWithCounts = loadedElections.map((election) => ({
        ...election,
        approvedCandidateCount: approvedCountByElection.get(election.id) ?? 0,
      }));

      setElections(electionsWithCounts);
    } catch (e: any) {
      setElections([]);
      setError(
        (e as any)?.body?.message ??
          (e as any)?.message ??
          "Failed to load elections",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadElections();
  }, [token]);

  const handleOpen = async () => {
    if (!selected) return;

    const selectedElection = elections.find(
      (election) => election.id === selected,
    );
    if ((selectedElection?.approvedCandidateCount ?? 0) === 0) {
      setError(
        "This election has no approved candidates. Approve candidates before opening voting.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await fetchJson(
        `/api/v1/elections/${encodeURIComponent(selected)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "VOTING_OPEN",
            reason: "Opened by admin",
          }),
        },
      );
      await loadElections();
      alert("Election opened for voting.");
    } catch (e: any) {
      setError(
        (e as any)?.body?.message ??
          (e as any)?.message ??
          "Failed to open election",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedElection = elections.find((el) => el.id === selected);
  const selectedHasCandidates =
    (selectedElection?.approvedCandidateCount ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto pb-20"
    >
      <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-black mb-4">{t("open_election")}</h2>
        <p className="text-sm text-slate-500 mb-4">{t("open_election_desc")}</p>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="mb-6">
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
            className="w-full p-3 border rounded"
          >
            <option value="">Select an election</option>
            {elections.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title} - {el.status} - {el.approvedCandidateCount ?? 0}{" "}
                approved candidate(s)
              </option>
            ))}
          </select>

          {selected && !selectedHasCandidates && (
            <p className="mt-3 text-sm text-amber-600 font-semibold">
              This election cannot be opened for voters until it has approved
              candidates.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            disabled={!selected || loading || !selectedHasCandidates}
            onClick={handleOpen}
            className="px-6 py-3 rounded-xl bg-election-dark text-white font-black disabled:opacity-50"
          >
            {t("open_election_now")}
          </button>
          <button
            onClick={() => setView("elections")}
            className="px-6 py-3 rounded-xl border bg-white"
          >
            {t("back_to_elections")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default AdminOpenElectionView;
