import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchJson } from '../services/api/client';
import type { ElectionPhase, VoteResults } from '../types/election';

export function useElectionRealtime(token: string | null) {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [electionPhase, setElectionPhase] = useState<ElectionPhase>('REGISTRATION');

  useEffect(() => {
    const socket = io({
      auth: { token },
    });

    socket.on('results-update', (data: VoteResults) => {
      setResults(data);
    });

    socket.on('phase-update', (data: { phase: ElectionPhase }) => {
      setElectionPhase(data.phase);
    });

    fetchJson<{ phase: ElectionPhase }>('/api/election/phase')
      .then((data) => {
        setElectionPhase(data.phase);
      })
      .catch((error) => {
        console.error('Failed to fetch initial election phase:', error);
      });

    return () => {
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
