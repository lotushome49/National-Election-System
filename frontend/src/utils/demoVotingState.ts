const DEMO_VOTER_AUTH_KEY = "demoVoterAuth";
const DEMO_USER_KEY = "nehs_user";
const DEMO_VOTE_LEDGER_KEY = "nehs_demo_vote_ledger";

type DemoVoterAuth = {
  nationalId?: string;
  voterId?: string;
  fullName?: string;
  faceEmbedding?: string;
  hasVoted?: boolean;
  receiptToken?: string | null;
  castAt?: string | null;
};

type DemoUserState = {
  id?: string;
  voterId?: string;
  uniqueVoterId?: string;
  nationalId?: string;
  fullName?: string;
  role?: string;
  hasVoted?: boolean;
  receiptToken?: string | null;
  castAt?: string | null;
};

type DemoVoteLedgerEntry = {
  electionId?: string | null;
  candidateId: string;
  voterId?: string | null;
  nationalId?: string | null;
  receiptHash: string;
  castAt: string;
};

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures in restricted environments
  }
}

export function readDemoVoterAuth() {
  return readJson<DemoVoterAuth>(DEMO_VOTER_AUTH_KEY);
}

export function readDemoUserState() {
  return readJson<DemoUserState>(DEMO_USER_KEY);
}

export function readDemoVoteLedger() {
  const ledger = readJson<DemoVoteLedgerEntry[]>(DEMO_VOTE_LEDGER_KEY);
  return Array.isArray(ledger) ? ledger : [];
}

export function persistDemoVoteState(input: {
  receiptHash: string;
  castAt: string;
  candidateId: string;
  electionId?: string | null;
}) {
  const auth = readDemoVoterAuth();
  const user = readDemoUserState();
  const voterId =
    auth?.voterId ?? user?.uniqueVoterId ?? user?.voterId ?? user?.id ?? null;
  const nationalId = auth?.nationalId ?? user?.nationalId ?? null;

  const nextAuth: DemoVoterAuth = {
    ...auth,
    hasVoted: true,
    receiptToken: input.receiptHash,
    castAt: input.castAt,
  };

  const nextUser: DemoUserState = {
    ...user,
    hasVoted: true,
    receiptToken: input.receiptHash,
    castAt: input.castAt,
    voterId: voterId ?? user?.voterId,
    uniqueVoterId: voterId ?? user?.uniqueVoterId,
    nationalId: nationalId ?? user?.nationalId,
  };

  const nextLedger = [
    ...readDemoVoteLedger(),
    {
      electionId: input.electionId ?? null,
      candidateId: input.candidateId,
      voterId,
      nationalId,
      receiptHash: input.receiptHash,
      castAt: input.castAt,
    },
  ];

  writeJson(DEMO_VOTER_AUTH_KEY, nextAuth);
  writeJson(DEMO_USER_KEY, nextUser);
  writeJson(DEMO_VOTE_LEDGER_KEY, nextLedger);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nehs:demo-vote-cast"));
  }

  return {
    auth: nextAuth,
    user: nextUser,
    ledger: nextLedger,
  };
}

export function summarizeDemoVotes(
  candidates: any[],
  electionId?: string | null,
) {
  const ledger = readDemoVoteLedger().filter((vote) => {
    if (!electionId) return true;
    return vote.electionId ? vote.electionId === electionId : true;
  });

  const uniqueVoterCount = Math.max(
    1,
    new Set(
      ledger.map((vote) => vote.voterId || vote.nationalId).filter(Boolean),
    ).size || 0,
  );

  const counts = candidates.map((candidate) => {
    const votes = ledger.filter(
      (vote) => vote.candidateId === candidate.id,
    ).length;
    return {
      id: candidate.id,
      name: candidate.fullName ?? candidate.name ?? candidate.id,
      party: candidate.party ?? "",
      votes,
      symbol: candidate.symbol ?? "🗳️",
    };
  });

  const totalBallots = ledger.length;
  const totalRegisteredVoters = uniqueVoterCount;
  const leadingCandidate =
    counts.slice().sort((left, right) => right.votes - left.votes)[0] ?? null;

  return {
    counts,
    totalBallots,
    totalRegisteredVoters,
    turnoutPercentage:
      totalRegisteredVoters > 0
        ? (totalBallots / totalRegisteredVoters) * 100
        : 0,
    candidateStandings: counts.map((candidate) => ({
      candidateId: candidate.id,
      fullName: candidate.name,
      party: candidate.party,
      votes: candidate.votes,
      percentage: totalBallots > 0 ? (candidate.votes / totalBallots) * 100 : 0,
    })),
    regionalBreakdown: [],
    election: electionId
      ? { id: electionId, title: "Demo Election", status: "VOTING_OPEN" }
      : null,
    leadingCandidate,
  };
}
