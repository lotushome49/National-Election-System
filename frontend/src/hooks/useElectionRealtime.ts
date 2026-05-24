import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fetchJson } from "../services/api/client";
import type { ElectionPhase, VoteResults } from "../types/election";

export function useElectionRealtime(token: string | null) {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [electionPhase, setElectionPhase] =
    useState<ElectionPhase>("REGISTRATION");
  const currentElectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setResults(null);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      try {
        // mask token for logs (show only last 6 chars)
        const masked = token ? `***${String(token).slice(-6)}` : "null";
        // eslint-disable-next-line no-console
        console.debug(
          "[useElectionRealtime] initializing socket.io with token:",
          masked,
        );
      } catch (e) {
        // ignore logging errors
      }
    }

    const socket = io({
      auth: { token },
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
            token ? `***${String(token).slice(-6)}` : "null",
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

    fetchJson<any>("/api/reports/overview", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        const overview = response?.data;
        if (overview?.election?.id) {
          currentElectionIdRef.current = overview.election.id;
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
      })
      .catch((error) => {
        // Surface richer debug info for non-OK responses from fetchJson
        // eslint-disable-next-line no-console
        console.error("Failed to fetch initial realtime overview:", error);
        if (error && (error as any).status) {
          // eslint-disable-next-line no-console
          console.debug(
            "[useElectionRealtime] overview fetch error status:",
            (error as any).status,
            "body:",
            (error as any).body ?? null,
          );
        }
      });

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
  }, [token]);

  return {
    electionPhase,
    results,
    setElectionPhase,
    setResults,
  };
}

function mapStatusToPhase(status: string): ElectionPhase {
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
