import { prisma } from '../../configs/database';
import type { CandidateQuery } from './candidate.schema';

export const candidateRepository = {
  findAll: async (q: CandidateQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.electionId && { electionId: q.electionId }),
      ...(q.status     && { status:     q.status }),
      ...(q.regionId   && { regionId:   q.regionId }),
    };

    const [data, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
        orderBy: [{ ballotOrder: 'asc' }, { fullName: 'asc' }],
      }),
      prisma.candidate.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.candidate.findFirst({ where: { id, deletedAt: null } }),

  create: (data: any) => prisma.candidate.create({ data }),

  update: (id: string, data: any) =>
    prisma.candidate.update({ where: { id }, data }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.candidate.update({
      where: { id },
      data:  { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
