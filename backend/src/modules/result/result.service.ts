import { v4 as uuidv4 } from 'uuid';
import { resultRepository } from './result.repository';
import { electionRepository } from '../election/election.repository';
import { NotFoundError, BadRequestError } from '../../errors/AppError';
import { buildPaginationMeta } from '../../utils/response';
import { auditService } from '../audit/audit.service';
import { socketEmit } from '../../config/socket';
import type { ResultQuery, ComputeResultDto } from './result.schema';

export const resultService = {
  async list(q: ResultQuery) {
    const { data, total } = await resultRepository.findAll(q);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async compute(dto: ComputeResultDto, actorId: string, ip: string) {
    const election = await electionRepository.findById(dto.electionId);
    if (!election) throw new NotFoundError('Election');

    const allowedStatuses = ['VOTING_CLOSED', 'COUNTING', 'RESULTS_DECLARED'];
    if (!allowedStatuses.includes(election.status)) {
      throw new BadRequestError('Results can only be computed after voting has closed');
    }

    // Aggregate ballot counts grouped by candidate + region
    const [aggregates, totalBallots] = await Promise.all([
      resultRepository.aggregateBallots(dto.electionId),
      resultRepository.totalBallots(dto.electionId),
    ]);

    if (totalBallots === 0) {
      throw new BadRequestError('No ballots have been cast for this election');
    }

    // Find the candidate with the most votes (for winner flag)
    const voteCounts = aggregates.reduce<Record<string, number>>((acc, row) => {
      acc[row.candidateId] = (acc[row.candidateId] ?? 0) + row._count.id;
      return acc;
    }, {});

    const maxVotes  = Math.max(...Object.values(voteCounts));
    const winnerId  = Object.keys(voteCounts).find((id) => voteCounts[id] === maxVotes);

    // Upsert one result row per candidate
    const upserts = aggregates.map((row) => {
      const votes      = row._count.id;
      const percentage = totalBallots > 0 ? (votes / totalBallots) * 100 : 0;

      return resultRepository.upsertResult({
        id:          uuidv4(),
        electionId:  dto.electionId,
        candidateId: row.candidateId,
        regionId:    row.regionId ?? undefined,
        totalVotes:  votes,
        validVotes:  votes,
        percentage:  Math.round(percentage * 100) / 100,
        isWinner:    row.candidateId === winnerId,
        isFinal:     dto.isFinal,
        createdBy:   actorId,
      });
    });

    await Promise.all(upserts);

    // Broadcast live results
    socketEmit.resultsUpdate({ electionId: dto.electionId, totalBallots, isFinal: dto.isFinal });

    await auditService.log({
      userId: actorId, action: 'RESULT_PUBLISHED', entity: 'Result',
      entityId: dto.electionId,
      description: `Results computed. Final: ${dto.isFinal}. Total ballots: ${totalBallots}`,
      ipAddress: ip,
    });

    return { electionId: dto.electionId, totalBallots, isFinal: dto.isFinal };
  },
};
