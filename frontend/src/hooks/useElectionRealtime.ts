import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fetchJson } from "../services/api/client";
import type { ElectionPhase, VoteResults } from "../types/election";

type ElectionSummary = {
  id: string;
  status: string;
  title?: string;
};

export function mapStatusToPhase(status: string): ElectionPhase {
  if (status === "VOTING_OPEN") return "VOTING";
  if (
    status === "VOTING_CLOSED" ||
    status === "COUNTING" ||
    status === "RESULTS_DECLARED"
  ) {
    return "CLOSED";
  }
  return "REGISTRATION";
}

function pickCurrentElection(elections: ElectionSummary[]) {
  return (
    elections.find((election) => election.status === "VOTING_OPEN") ??
    elections.find(
      (election) =>
        election.status !== "RESULTS_DECLARED" &&
        election.status !== "CANCELLED",
    ) ??
    null
  );
}

export function useElectionRealtime(token: string | null, enabled = true) {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [electionPhase, setElectionPhase] =
    useState<ElectionPhase>("REGISTRATION");
  const [currentElectionId, setCurrentElectionId] = useState<string | null>(
    null,
  );
  const [currentElectionTitle, setCurrentElectionTitle] = useState<
    string | null
  >(null);
  const [currentElectionStatus, setCurrentElectionStatus] = useState<
    string | null
  >(null);
  const currentElectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults(null);
      setCurrentElectionId(null);
      setCurrentElectionTitle(null);
      setCurrentElectionStatus(null);
      return;
    }

    const effectiveToken =
      token ??
      (typeof window !== "undefined"
        ? localStorage.getItem("nehs_token")
        : null);

    if (!effectiveToken) {
      setResults(null);
      setCurrentElectionId(null);
      setCurrentElectionTitle(null);
      setCurrentElectionStatus(null);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      try {
        // mask token for logs (show only last 6 chars)
        const masked = effectiveToken
          ? `***${String(effectiveToken).slice(-6)}`
          : "null";
        console.debug(
          "[useElectionRealtime] initializing socket.io with token:",
          masked,
        );
      } catch (e) {
        // ignore logging errors
      }
    }

    const socket = io({
      auth: { token: effectiveToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      if (currentElectionIdRef.current) {
        socket.emit("join:election", currentElectionIdRef.current);
      }
    });

    socket.on("results:update", (data: any) => {
      if (typeof data?.electionId === "string") {
        currentElectionIdRef.current = data.electionId;
        setCurrentElectionId(data.electionId);
        socket.emit("join:election", data.electionId);
      }

      setResults((prev) => {
        if (!prev) {
          return {
            counts: [],
            total: Number(data?.totalVotes ?? data?.totalBallots ?? 0),
            electionDate: new Date().toISOString(),
            regional: [],
          };
        }

        return {
          ...prev,
          total: Number(data?.totalVotes ?? data?.totalBallots ?? prev.total),
        };
      });
    });

    socket.on("election:state", (data: { status?: string }) => {
      if (!data?.status) return;
      setElectionPhase(mapStatusToPhase(data.status));
    });

    socket.on("connect_error", (error) => {
      console.error("Realtime connection error:", error.message);

      if (process.env.NODE_ENV === "development") {
        try {
          // eslint-disable-next-line no-console
          console.debug(
            "[useElectionRealtime] socket connect_error, token masked:",
            effectiveToken ? `***${String(effectiveToken).slice(-6)}` : "null",
            "error:",
            error,
          );
        } catch (e) {
          // ignore
        }
      }

      if (
        error.message.includes("Authentication required") ||
        error.message.includes("Invalid or expired token") ||
        error.message.includes("Access token required") ||
        error.message.includes("Session is no longer active")
      ) {
        socket.disconnect();
      }
    });

    const loadElectionContext = async () => {
      try {
        const response = await fetchJson<any>("/api/reports/overview", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });

        const overview = response?.data;
        if (overview?.election?.id) {
          currentElectionIdRef.current = overview.election.id;
          setCurrentElectionId(overview.election.id);
          setCurrentElectionTitle(overview.election.title ?? null);
          setCurrentElectionStatus(overview.election.status ?? null);
          socket.emit("join:election", overview.election.id);
        }

        setResults({
          counts:
            overview?.candidateStandings?.map((candidate: any) => ({
              id: candidate.candidateId,
              name: candidate.fullName,
              party: candidate.party,
              votes: candidate.votes,
            })) ?? [],
          total: overview?.totalBallots ?? 0,
          electionDate: new Date().toISOString(),
          regional:
            overview?.regionalBreakdown?.map((region: any) => ({
              id: region.regionId,
              name: region.regionName,
              total: region.totalBallots,
              candidates: [],
            })) ?? [],
        });

        if (overview?.election?.status) {
          setElectionPhase(mapStatusToPhase(overview.election.status));
        }
        return;
      } catch (error) {
        // Fallback for roles that cannot access reporting data, such as voters.
        try {
          const response = await fetchJson<{ data: ElectionSummary }>(
            "/api/v1/elections/current/open",
            {},
          );

          const activeElection = response?.data ?? null;

          if (activeElection?.id) {
            currentElectionIdRef.current = activeElection.id;
            setCurrentElectionId(activeElection.id);
            setCurrentElectionTitle(activeElection.title ?? null);
            setCurrentElectionStatus(activeElection.status ?? null);
            socket.emit("join:election", activeElection.id);
          }

          if (activeElection?.status) {
            setElectionPhase(mapStatusToPhase(activeElection.status));
          }

          setResults({
            counts: [],
            total: 0,
            electionDate: new Date().toISOString(),
            regional: [],
          });
        } catch (fallbackError) {
          // Surface richer debug info for non-OK responses from fetchJson
          // eslint-disable-next-line no-console
          console.error("Failed to fetch initial realtime context:", error);
          if (error && (error as any).status) {
            // eslint-disable-next-line no-console
            console.debug(
              "[useElectionRealtime] overview fetch error status:",
              (error as any).status,
              "body:",
              (error as any).body ?? null,
            );
          }
          // eslint-disable-next-line no-console
          console.error(
            "Failed to fetch election fallback context:",
            fallbackError,
          );
        }
      }
    };

    void loadElectionContext();

    return () => {
      if (currentElectionIdRef.current) {
        socket.emit("leave:election", currentElectionIdRef.current);
      }
      socket.off("connect");
      socket.off("results:update");
      socket.off("election:state");
      socket.off("connect_error");
      socket.close();
    };
  }, [token, enabled]);

  return {
    electionPhase,
    results,
    currentElectionId,
    currentElectionTitle,
    currentElectionStatus,
    setElectionPhase,
    setResults,
  };
}
