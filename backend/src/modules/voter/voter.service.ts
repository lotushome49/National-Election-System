import { v4 as uuidv4 } from 'uuid';
import { voterRepository } from './voter.repository';
import { sha256, encrypt } from '../../utils/crypto';
import { ConflictError, NotFoundError } from '../../errors/AppError';
import { buildPaginationMeta } from '../../utils/response';
import { auditService } from '../audit/audit.service';
import type { RegisterVoterDto, UpdateVoterDto, VoterQuery } from './voter.schema';

export const voterService = {
  async list(q: VoterQuery) {
    const { data, total } = await voterRepository.findAll(q);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string) {
    const voter = await voterRepository.findById(id);
    if (!voter) throw new NotFoundError('Voter');
    return voter;
  },

  async register(dto: RegisterVoterDto, actorId: string, ip: string) {
    // Deduplication checks
    const byNationalId = await voterRepository.findByNationalId(dto.nationalId);
    if (byNationalId) throw new ConflictError('A voter with this national ID already exists');

    const biometricHash = sha256(dto.biometricHash);
    const byBiometric   = await voterRepository.findByBiometricHash(biometricHash);
    if (byBiometric) throw new ConflictError('Biometric data already registered');

    const voter = await voterRepository.create({
      id:               uuidv4(),
      voterId:          `ET-${Date.now()}`,
      fullName:         dto.fullName,
      nationalId:       dto.nationalId,
      dateOfBirth:      new Date(dto.dateOfBirth),
      gender:           dto.gender,
      phone:            dto.phone,
      email:            dto.email,
      address:          dto.address,
      regionId:         dto.regionId,
      districtId:       dto.districtId,
      pollingStationId: dto.pollingStationId,
      biometricTemplate: encrypt(dto.biometricHash),  // AES-256 encrypted
      biometricHash,                                   // SHA-256 for lookup
      isVerified:       false,
      createdBy:        actorId,
    });

    await auditService.log({
      userId: actorId, action: 'CREATE', entity: 'Voter', entityId: voter.id,
      description: 'Voter registered', ipAddress: ip,
    });

    return { id: voter.id, voterId: voter.voterId };
  },

  async update(id: string, dto: UpdateVoterDto, actorId: string, ip: string) {
    const existing = await voterRepository.findById(id);
    if (!existing) throw new NotFoundError('Voter');

    const updated = await voterRepository.update(id, { ...dto, updatedBy: actorId });

    await auditService.log({
      userId: actorId, action: 'UPDATE', entity: 'Voter', entityId: id,
      oldValues: existing, newValues: dto, ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string) {
    const existing = await voterRepository.findById(id);
    if (!existing) throw new NotFoundError('Voter');

    await voterRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId, action: 'DELETE', entity: 'Voter', entityId: id,
      description: 'Voter soft-deleted', ipAddress: ip,
    });
  },
};
