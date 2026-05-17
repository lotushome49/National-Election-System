import { v4 as uuidv4 } from 'uuid';
import { candidateRepository } from './candidate.repository';
import { electionRepository } from '../election/election.repository';
import { NotFoundError, BadRequestError } from '../../errors/AppError';
import { buildPaginationMeta } from '../../utils/response';
import { auditService } from '../audit/audit.service';
import type { CreateCandidateDto, UpdateCandidateDto, CandidateStatusDto, CandidateQuery } from './candidate.schema';

export const candidateService = {
  async list(q: CandidateQuery) {
    const { data, total } = await candidateRepository.findAll(q);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) throw new NotFoundError('Candidate');
    return candidate;
  },

  async create(dto: CreateCandidateDto, actorId: string, ip: string) {
    const election = await electionRepository.findById(dto.electionId);
    if (!election) throw new NotFoundError('Election');

    if (!['NOMINATION_OPEN', 'NOMINATION_CLOSED'].includes(election.status)) {
      throw new BadRequestError('Candidates can only be added during the nomination phase');
    }

    const candidate = await candidateRepository.create({
      id: uuidv4(), ...dto, status: 'PENDING', createdBy: actorId,
    });

    await auditService.log({
      userId: actorId, action: 'CREATE', entity: 'Candidate', entityId: candidate.id,
      newValues: { fullName: dto.fullName, party: dto.party }, ipAddress: ip,
    });

    return candidate;
  },

  async update(id: string, dto: UpdateCandidateDto, actorId: string, ip: string) {
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError('Candidate');

    const updated = await candidateRepository.update(id, { ...dto, updatedBy: actorId });

    await auditService.log({
      userId: actorId, action: 'UPDATE', entity: 'Candidate', entityId: id,
      oldValues: existing, newValues: dto, ipAddress: ip,
    });

    return updated;
  },

  async updateStatus(id: string, dto: CandidateStatusDto, actorId: string, ip: string) {
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError('Candidate');

    const updated = await candidateRepository.update(id, { status: dto.status, updatedBy: actorId });

    await auditService.log({
      userId: actorId, action: 'UPDATE', entity: 'Candidate', entityId: id,
      oldValues: { status: existing.status }, newValues: { status: dto.status },
      description: dto.reason, ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string) {
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError('Candidate');

    await candidateRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId, action: 'DELETE', entity: 'Candidate', entityId: id,
      description: 'Candidate soft-deleted', ipAddress: ip,
    });
  },
};
