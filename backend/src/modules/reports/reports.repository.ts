import { prisma } from "../../configs/database";

type ScopeFilter = {
  regionId?: string;
  districtId?: string;
  pollingStationId?: string;
};

export const reportsRepository = {
  findElectionById: (id: string) =>
    prisma.election.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true, status: true, isNational: true },
    }),

  findLatestElection: () =>
    prisma.election.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, isNational: true },
    }),

  countBallots: (electionId: string, scope: ScopeFilter) =>
    prisma.ballot.count({
      where: {
        electionId,
        ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.districtId && { districtId: scope.districtId }),
        ...(scope.pollingStationId && {
          pollingStationId: scope.pollingStationId,
        }),
      },
    }),

  countRegisteredVoters: (scope: ScopeFilter) =>
    prisma.voter.count({
      where: {
        deletedAt: null,
        ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.districtId && { districtId: scope.districtId }),
        ...(scope.pollingStationId && {
          pollingStationId: scope.pollingStationId,
        }),
      },
    }),

  aggregateVotesByCandidate: (electionId: string, scope: ScopeFilter) =>
    prisma.ballot.groupBy({
      by: ["candidateId"],
      where: {
        electionId,
        ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.districtId && { districtId: scope.districtId }),
        ...(scope.pollingStationId && {
          pollingStationId: scope.pollingStationId,
        }),
      },
      _count: { id: true },
    }),

  findCandidatesByIds: (candidateIds: string[]) =>
    prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        fullName: true,
        party: true,
        partyCode: true,
      },
    }),

  aggregateVotesByRegion: (electionId: string, scope: ScopeFilter) =>
    prisma.ballot.groupBy({
      by: ["regionId"],
      where: {
        electionId,
        ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.districtId && { districtId: scope.districtId }),
        ...(scope.pollingStationId && {
          pollingStationId: scope.pollingStationId,
        }),
      },
      _count: { id: true },
    }),

  findRegionsByIds: (regionIds: string[]) =>
    prisma.region.findMany({
      where: { id: { in: regionIds }, deletedAt: null },
      select: { id: true, name: true },
    }),

  // Fetch voter demographics within an optional scope
  findVotersForDemographics: (scope: ScopeFilter) =>
    prisma.voter.findMany({
      where: {
        deletedAt: null,
        ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.districtId && { districtId: scope.districtId }),
        ...(scope.pollingStationId && {
          pollingStationId: scope.pollingStationId,
        }),
      },
      select: { id: true, dateOfBirth: true, gender: true },
    }),
};
