import { prisma } from "../../configs/database";

export const votingRepository = {
  // ── Token operations ────────────────────────────────────────────────────────
  findToken: (electionId: string, voterId: string) =>
    prisma.votingToken.findUnique({
      where: { electionId_voterId: { electionId, voterId } },
    }),

  findTokenByHash: (tokenHash: string) =>
    prisma.votingToken.findUnique({ where: { tokenHash } }),

  createToken: (data: {
    id: string;
    electionId: string;
    voterId: string;
    issuedToUser?: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) => prisma.votingToken.create({ data }),

  markTokenUsed: (id: string) =>
    prisma.votingToken.update({
      where: { id },
      data: { status: "USED", usedAt: new Date() },
    }),

  // ── Ballot operations ───────────────────────────────────────────────────────
  findBallotByToken: (votingTokenId: string) =>
    prisma.ballot.findUnique({ where: { votingTokenId } }),

  findBallotByReceipt: (receiptHash: string) =>
    prisma.ballot.findUnique({ where: { receiptHash } }),

  findLatestBallotByVoter: (voterId: string) =>
    prisma.ballot.findFirst({
      where: { voterId },
      orderBy: { castAt: "desc" },
      select: {
        id: true,
        electionId: true,
        castAt: true,
        receiptHash: true,
      },
    }),

  castBallot: (data: {
    id: string;
    electionId: string;
    candidateId: string;
    votingTokenId: string;
    voterId: string;
    regionId: string;
    districtId?: string;
    pollingStationId?: string;
    ipAddress?: string;
    receiptHash: string;
  }) => prisma.ballot.create({ data }),

  // Find ballot by voter and election to prevent duplicates
  findBallotByVoterAndElection: (voterId: string, electionId: string) =>
    prisma.ballot.findFirst({ where: { voterId, electionId } }),
  countByElection: (electionId: string) =>
    prisma.ballot.count({ where: { electionId } }),

  countByCandidate: (electionId: string, candidateId: string) =>
    prisma.ballot.count({ where: { electionId, candidateId } }),

  markVoterHasVoted: (voterId: string) =>
    prisma.voter.update({
      where: { id: voterId },
      data: { hasVoted: true },
    }),
};
