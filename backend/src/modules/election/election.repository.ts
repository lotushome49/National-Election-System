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

  findById: (id: string) =>
    prisma.election.findFirst({
      where: { id, deletedAt: null },
      include: {
        candidates: { where: { deletedAt: null, status: "APPROVED" } },
      },
    }),

  findCurrentVotingOpen: () =>
    prisma.election.findFirst({
      where: { deletedAt: null, status: "VOTING_OPEN" },
      orderBy: { updatedAt: "desc" },
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
