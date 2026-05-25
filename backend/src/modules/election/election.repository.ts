import { prisma } from "../../configs/database";
import type { ElectionQuery } from "./election.schema";

export const electionRepository = {
  findAll: async (q: ElectionQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.status && { status: q.status }),
      ...(q.type && { type: q.type }),
    };

    const [data, total] = await Promise.all([
      prisma.election.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.election.count({ where }),
    ]);

    return { data, total };
  },

  findHistory: async (limit = 10) => {
    const elections = await prisma.election.findMany({
      where: {
        deletedAt: null,
        status: "RESULTS_DECLARED",
      },
      orderBy: [{ resultsAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        results: {
          where: { isFinal: true },
          orderBy: { totalVotes: "desc" },
          include: {
            candidate: {
              select: {
                fullName: true,
                party: true,
              },
            },
          },
        },
      },
    });

    const summaries = await Promise.all(
      elections.map(async (election) => {
        const turnout = await prisma.ballot.count({
          where: { electionId: election.id },
        });

        const winner =
          election.results.find((result) => result.isWinner) ??
          election.results[0] ??
          null;

        const summaryDate = election.resultsAt ?? election.updatedAt;

        return {
          id: election.id,
          title: election.title,
          year: summaryDate.getFullYear().toString(),
          date: summaryDate.toISOString().slice(0, 10),
          turnout,
          winner: winner?.candidate.fullName ?? "TBD",
          percentage: `${Number(winner?.percentage ?? 0).toFixed(1)}%`,
          status: "Certified",
          winnerParty: winner?.candidate.party ?? null,
        };
      }),
    );

    return summaries;
  },

  findById: (id: string) =>
    prisma.election.findFirst({
      where: { id, deletedAt: null },
      include: {
        candidates: { where: { deletedAt: null, status: "APPROVED" } },
      },
    }),

  findCurrentVotingOpen: async () => {
    const elections = await prisma.election.findMany({
      where: { deletedAt: null, status: "VOTING_OPEN" },
      orderBy: { updatedAt: "desc" },
      include: {
        candidates: { where: { deletedAt: null, status: "APPROVED" } },
      },
    });

    return (
      elections.find((election) => election.candidates.length > 0) ??
      elections[0] ??
      null
    );
  },

  countApprovedCandidates: (electionId: string) =>
    prisma.candidate.count({
      where: { electionId, deletedAt: null, status: "APPROVED" },
    }),

  closeOtherOpenElections: (id: string, updatedBy: string) =>
    prisma.election.updateMany({
      where: {
        id: { not: id },
        deletedAt: null,
        status: "VOTING_OPEN",
      },
      data: {
        status: "VOTING_CLOSED",
        updatedBy,
      },
    }),

  findCurrentForRegistration: () =>
    prisma.election.findFirst({
      where: {
        deletedAt: null,
        status: { notIn: ["RESULTS_DECLARED", "CANCELLED"] },
      },
      orderBy: { updatedAt: "desc" },
    }),

  create: (data: any) => prisma.election.create({ data }),

  update: (id: string, data: any) =>
    prisma.election.update({ where: { id }, data }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.election.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
