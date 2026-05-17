import { prisma } from '../../config/database';
import type { ResultQuery } from './result.schema';

export const resultRepository = {
  findAll: async (q: ResultQuery) => {
    const where: any = {
      electionId: q.electionId,
      ...(q.regionId         && { regionId:         q.regionId }),
      ...(q.districtId       && { districtId:       q.districtId }),
      ...(q.pollingStationId && { pollingStationId: q.pollingStationId }),
      ...(q.isFinal !== undefined && { isFinal: q.isFinal }),
    };

    const [data, total] = await Promise.all([
      prisma.result.findMany({
        where,
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
        orderBy: { totalVotes: 'desc' },
        include: {
          candidate: {
            select: { id: true, fullName: true, party: true, partyCode: true, photoUrl: true },
          },
        },
      }),
      prisma.result.count({ where }),
    ]);

    return { data, total };
  },

  // Aggregate ballot counts per candidate for an election
  aggregateBallots: (electionId: string) =>
    prisma.ballot.groupBy({
      by:      ['candidateId', 'regionId'],
      where:   { electionId },
      _count:  { id: true },
    }),

  // Total ballots cast in an election
  totalBallots: (electionId: string) =>
    prisma.ballot.count({ where: { electionId } }),

  upsertResult: (data: {
    id: string; electionId: string; candidateId: string;
    regionId?: string; totalVotes: number; validVotes: number;
    percentage: number; isWinner: boolean; isFinal: boolean;
    createdBy: string;
  }) =>
    prisma.result.upsert({
      where: {
        electionId_candidateId_regionId_districtId_pollingStationId: {
          electionId:       data.electionId,
          candidateId:      data.candidateId,
          regionId:         data.regionId ?? null,
          districtId:       null,
          pollingStationId: null,
        },
      },
      create: { ...data },
      update: {
        totalVotes:  data.totalVotes,
        validVotes:  data.validVotes,
        percentage:  data.percentage,
        isWinner:    data.isWinner,
        isFinal:     data.isFinal,
        computedAt:  new Date(),
      },
    }),
};
