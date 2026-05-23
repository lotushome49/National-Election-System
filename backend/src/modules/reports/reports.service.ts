import { NotFoundError } from "../../errors/AppError";
import { applyUserScope } from "../../utils/scope";
import type { JwtPayload } from "../../types";
import type { ReportsQuery } from "./reports.schema";
import { reportsRepository } from "./reports.repository";

type ReportScope = {
  regionId?: string;
  districtId?: string;
  pollingStationId?: string;
};

type CandidateStanding = {
  id: string;
  candidateId: string;
  fullName: string;
  party: string;
  partyCode: string | null;
  votes: number;
  percentage: number;
  isWinner: boolean;
};

type RegionalBreakdown = {
  regionId: string;
  regionName: string;
  totalBallots: number;
};

export const reportsService = {
  // Simple in-memory cache to reduce load for expensive aggregation queries.
  // Keyed by electionId + region/district/polling scope.
  // TTL in ms
  _cache: new Map<string, { ts: number; value: any }>(),
  _cacheTtl: 15 * 1000, // 15s default for dev; tune in prod or replace with Redis

  async getOverview(query: ReportsQuery, requester?: JwtPayload) {
    const cacheKey = (() => {
      const id = query.electionId ?? "latest";
      const scope = applyUserScope<ReportScope>({ regionId: undefined, districtId: undefined, pollingStationId: undefined }, requester);
      return `overview:${id}:r:${scope.regionId ?? "_"}:d:${scope.districtId ?? "_"}:p:${scope.pollingStationId ?? "_"}`;
    })();

    const cached = (reportsService as any)._cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < (reportsService as any)._cacheTtl) {
      return cached.value;
    }

    // fallthrough to compute the overview and then cache it below

    async function compute(): Promise<any> {
    const election = query.electionId
      ? await reportsRepository.findElectionById(query.electionId)
      : await reportsRepository.findLatestElection();

    if (!election) {
      throw new NotFoundError("Election");
    }

    const scoped = applyUserScope<ReportScope>(
      {
        regionId: undefined,
        districtId: undefined,
        pollingStationId: undefined,
      },
      requester,
    );

    const [
      totalBallots,
      totalRegisteredVoters,
      candidateVotes,
      regionalVotes,
    ] = await Promise.all([
      reportsRepository.countBallots(election.id, scoped),
      reportsRepository.countRegisteredVoters(scoped),
      reportsRepository.aggregateVotesByCandidate(election.id, scoped),
      reportsRepository.aggregateVotesByRegion(election.id, scoped),
    ]);

    const candidateIds = candidateVotes.map((row) => row.candidateId);
    const [candidateDetails, regions] = await Promise.all([
      candidateIds.length > 0
        ? reportsRepository.findCandidatesByIds(candidateIds)
        : Promise.resolve([]),
      regionalVotes.length > 0
        ? reportsRepository.findRegionsByIds(regionalVotes.map((row) => row.regionId))
        : Promise.resolve([]),
    ]);

    const candidateMap = new Map(candidateDetails.map((c) => [c.id, c]));
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));

    const standingsBase = candidateVotes.map((row) => {
      const candidate = candidateMap.get(row.candidateId);
      const votes = row._count.id;
      const percentage = totalBallots > 0 ? (votes / totalBallots) * 100 : 0;

      return {
        id: row.candidateId,
        candidateId: row.candidateId,
        fullName: candidate?.fullName ?? "Unknown Candidate",
        party: candidate?.party ?? "Independent",
        partyCode: candidate?.partyCode ?? null,
        votes,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    const maxVotes = standingsBase.reduce(
      (acc, current) => Math.max(acc, current.votes),
      0,
    );

    const candidateStandings: CandidateStanding[] = standingsBase
      .map((standing) => ({
        ...standing,
        isWinner: maxVotes > 0 && standing.votes === maxVotes,
      }))
      .sort((a, b) => b.votes - a.votes);

    const regionalBreakdown: RegionalBreakdown[] = regionalVotes
      .map((row) => ({
        regionId: row.regionId,
        regionName: regionMap.get(row.regionId) ?? "Unknown Region",
        totalBallots: row._count.id,
      }))
      .sort((a, b) => b.totalBallots - a.totalBallots);

    const turnoutPercentage =
      totalRegisteredVoters > 0
        ? Math.round((totalBallots / totalRegisteredVoters) * 10000) / 100
        : 0;

    const result = {
      election,
      totalBallots,
      totalRegisteredVoters,
      turnoutPercentage,
      candidateStandings,
      regionalBreakdown,
    };

    (reportsService as any)._cache.set(cacheKey, { ts: Date.now(), value: result });
    return result;
  },

  buildOverviewCsv(overview: {
    election: { id: string; title: string; status: string; isNational: boolean };
    totalBallots: number;
    totalRegisteredVoters: number;
    turnoutPercentage: number;
    candidateStandings: CandidateStanding[];
    regionalBreakdown: RegionalBreakdown[];
  }): string {
    const lines: string[] = [];

    lines.push("National Election System Reports Export");
    lines.push(`Election ID,${overview.election.id}`);
    lines.push(`Election Title,${overview.election.title}`);
    lines.push(`Election Status,${overview.election.status}`);
    lines.push(`Scope,${overview.election.isNational ? "National" : "Scoped"}`);
    lines.push(`Total Ballots,${overview.totalBallots}`);
    lines.push(`Registered Voters,${overview.totalRegisteredVoters}`);
    lines.push(`Turnout Percentage,${overview.turnoutPercentage}`);
    lines.push("");

    lines.push("Candidate Standings");
    lines.push("Candidate ID,Full Name,Party,Party Code,Votes,Percentage,Winner");
    for (const standing of overview.candidateStandings) {
      lines.push(
        [
          standing.candidateId,
          sanitizeCsvValue(standing.fullName),
          sanitizeCsvValue(standing.party),
          sanitizeCsvValue(standing.partyCode ?? ""),
          String(standing.votes),
          String(standing.percentage),
          standing.isWinner ? "YES" : "NO",
        ].join(","),
      );
    }

    lines.push("");
    lines.push("Regional Breakdown");
    lines.push("Region ID,Region Name,Total Ballots");
    for (const region of overview.regionalBreakdown) {
      lines.push(
        [
          region.regionId,
          sanitizeCsvValue(region.regionName),
          String(region.totalBallots),
        ].join(","),
      );
    }

    return lines.join("\n");
  },
};

function sanitizeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, '""')}"`;
  }
  return value;
}
