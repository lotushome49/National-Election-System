import { v4 as uuidv4 } from "uuid";
import { voterRepository } from "./voter.repository";
import { sha256, encrypt } from "../../utils/crypto";
import { ConflictError, NotFoundError } from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { applyUserScope, assertUserScopeAccess } from "../../utils/scope";
import { auditService } from "../audit/audit.service";
import type { JwtPayload } from "../../types";
import type {
  RegisterVoterDto,
  UpdateVoterDto,
  VoterQuery,
} from "./voter.schema";

export const voterService = {
  async list(q: VoterQuery, requester?: JwtPayload) {
    const scopedQuery = applyUserScope(q, requester);
    const { data, total } = await voterRepository.findAll(scopedQuery);
    return {
      data,
      meta: buildPaginationMeta(total, scopedQuery.page, scopedQuery.limit),
    };
  },

  async getById(id: string, requester?: JwtPayload) {
    const voter = await voterRepository.findById(id);
    if (!voter) throw new NotFoundError("Voter");
    assertUserScopeAccess(
      requester,
      { regionId: voter.regionId, districtId: voter.districtId },
      "voters",
    );
    return voter;
  },

  async register(
    dto: RegisterVoterDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    // Deduplication checks
    const byNationalId = await voterRepository.findByNationalId(dto.nationalId);
    if (byNationalId)
      throw new ConflictError("A voter with this national ID already exists");

    const biometricHash = sha256(dto.biometricHash);
    const byBiometric =
      await voterRepository.findByBiometricHash(biometricHash);
    if (byBiometric)
      throw new ConflictError("Biometric data already registered");

    assertUserScopeAccess(
      requester,
      { regionId: dto.regionId, districtId: dto.districtId },
      "voters",
    );

    const voter = await voterRepository.create({
      id: uuidv4(),
      voterId: `ET-${Date.now()}`,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      dateOfBirth: new Date(dto.dateOfBirth),
      gender: dto.gender,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      regionId: dto.regionId,
      districtId: dto.districtId,
      pollingStationId: dto.pollingStationId,
      biometricTemplate: encrypt(dto.biometricHash), // AES-256 encrypted
      biometricHash, // SHA-256 for lookup
      isVerified: false,
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "Voter",
      entityId: voter.id,
      description: "Voter registered",
      ipAddress: ip,
    });

    return { id: voter.id, voterId: voter.voterId };
  },

  async update(
    id: string,
    dto: UpdateVoterDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const existing = await voterRepository.findById(id);
    if (!existing) throw new NotFoundError("Voter");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      "voters",
    );

    const updated = await voterRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Voter",
      entityId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: ip,
    });

    return updated;
  },

  async remove(
    id: string,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const existing = await voterRepository.findById(id);
    if (!existing) throw new NotFoundError("Voter");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      "voters",
    );

    await voterRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "Voter",
      entityId: id,
      description: "Voter soft-deleted",
      ipAddress: ip,
    });
  },
};
