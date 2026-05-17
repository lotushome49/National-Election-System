import { prisma } from '../../configs/database';

export const votingRepository = {
  // ── Token operations ────────────────────────────────────────────────────────
  findToken: (electionId: string, voterId: string) =>
    prisma.votingToken.findUnique({
      where: { electionId_voterId: { electionId, voterId } },
    }),

  findTokenByHash: (tokenHash: string) =>
    prisma.votingToken.findUnique({ where: { tokenHash } }),

  createToken: (data: {
    id: string; electionId: string; voterId: string;
    issuedToUser?: string; tokenHash: string;
    expiresAt: Date; ipAddress?: string; userAgent?: string;
  }) => prisma.votingToken.create({ data }),

  markTokenUsed: (id: string) =>
    prisma.votingToken.update({
      where: { id },
      data:  { status: 'USED', usedAt: new Date() },
    }),

  // ── Ballot operations ───────────────────────────────────────────────────────
  findBallotByToken: (votingTokenId: string) =>
    prisma.ballot.findUnique({ where: { votingTokenId } }),

  findBallotByReceipt: (receiptHash: string) =>
    prisma.ballot.findUnique({ where: { receiptHash } }),

  castBallot: (data: {
    id: string; electionId: string; candidateId: string;
    votingTokenId: string; voterId: string; regionId: string;
    districtId?: string; pollingStationId?: string;
    ipAddress?: string; receiptHash: string;
  }) => prisma.ballot.create({ data }),

  // ── Count helpers ───────────────────────────────────────────────────────────
  countByElection: (electionId: string) =>
    prisma.ballot.count({ where: { electionId } }),

  countByCandidate: (electionId: string, candidateId: string) =>
    prisma.ballot.count({ where: { electionId, candidateId } }),
};
