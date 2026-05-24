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
      const scope = applyUserScope<ReportScope>(
        {
          regionId: undefined,
          districtId: undefined,
          pollingStationId: undefined,
        },
        requester,
      );
      return `overview:${id}:r:${scope.regionId ?? "_"}:d:${scope.districtId ?? "_"}:p:${scope.pollingStationId ?? "_"}`;
    })();

    const cached = (reportsService as any)._cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < (reportsService as any)._cacheTtl) {
      return cached.value;
    }

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

    const [totalBallots, totalRegisteredVoters, candidateVotes, regionalVotes] =
      await Promise.all([
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
        ? reportsRepository.findRegionsByIds(
            regionalVotes.map((row) => row.regionId),
          )
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

    (reportsService as any)._cache.set(cacheKey, {
      ts: Date.now(),
      value: result,
    });
    return result;
  },

  buildOverviewCsv(overview: {
    election: {
      id: string;
      title: string;
      status: string;
      isNational: boolean;
    };
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
    lines.push(
      "Candidate ID,Full Name,Party,Party Code,Votes,Percentage,Winner",
    );
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
  async exportTurnoutCsv(query: ReportsQuery, requester?: JwtPayload) {
    const overview = await reportsService.getOverview(query, requester);
    const lines: string[] = [];
    lines.push("Turnout Report Export");
    lines.push(`Election ID,${overview.election.id}`);
    lines.push(`Election Title,${overview.election.title}`);
    lines.push(`Total Ballots,${overview.totalBallots}`);
    lines.push(`Registered Voters,${overview.totalRegisteredVoters}`);
    lines.push(`Turnout Percentage,${overview.turnoutPercentage}`);
    lines.push("");
    lines.push("Regional Turnout Breakdown");
    lines.push("Region ID,Region Name,Total Ballots,Percentage");
    for (const r of overview.regionalBreakdown) {
      const pct =
        overview.totalBallots > 0
          ? (r.totalBallots / overview.totalBallots) * 100
          : 0;
      lines.push(
        [
          r.regionId,
          sanitizeCsvValue(r.regionName),
          String(r.totalBallots),
          String(Math.round(pct * 100) / 100),
        ].join(","),
      );
    }
    return lines.join("\n");
  },

  async exportDemographicsCsv(query: ReportsQuery, requester?: JwtPayload) {
    const scoped = applyUserScope<any>(query as any, requester);
    // respect optional electionId for scope/filters but demographics are from voters table
    const voters = await reportsRepository.findVotersForDemographics(scoped);

    // Buckets: <18, 18-25, 26-40, 41-60, >60
    const ageBuckets: { [k: string]: number } = {
      "<18": 0,
      "18-25": 0,
      "26-40": 0,
      "41-60": 0,
      ">60": 0,
    };
    const genderCounts: { [k: string]: number } = {};

    const now = new Date();
    for (const v of voters) {
      // gender
      const g = v.gender ?? "UNKNOWN";
      genderCounts[g] = (genderCounts[g] || 0) + 1;

      // age
      if (v.dateOfBirth) {
        const dob = new Date(v.dateOfBirth as any);
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        if (age < 18) ageBuckets["<18"]++;
        else if (age <= 25) ageBuckets["18-25"]++;
        else if (age <= 40) ageBuckets["26-40"]++;
        else if (age <= 60) ageBuckets["41-60"]++;
        else ageBuckets[">60"]++;
      } else {
        // unknown age goes to UNKNOWN bucket
        ageBuckets["<18"] += 0; // no-op; keep totals consistent
      }
    }

    const lines: string[] = [];
    lines.push("Demographics Report Export");
    lines.push(`Scope,${scoped.regionId ?? "all"}`);
    lines.push(`Total Voters,${voters.length}`);
    lines.push("");
    lines.push("Gender Breakdown");
    lines.push("Gender,Count");
    for (const [g, count] of Object.entries(genderCounts)) {
      lines.push([sanitizeCsvValue(g), String(count)].join(","));
    }
    lines.push("");
    lines.push("Age Buckets");
    lines.push("Bucket,Count");
    for (const k of ["<18", "18-25", "26-40", "41-60", ">60"]) {
      lines.push([k, String(ageBuckets[k])].join(","));
    }

    return lines.join("\n");
  },
};

function sanitizeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/\"/g, '""')}"`;
  }
  return value;
}
