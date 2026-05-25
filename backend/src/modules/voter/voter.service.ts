import { v4 as uuidv4 } from "uuid";
import { voterRepository } from "./voter.repository";
import { sha256, encrypt, decrypt } from "../../utils/crypto";
import { ConflictError, NotFoundError } from "../../errors/AppError";
import { prisma } from "../../configs/database";
import { computeFaceEmbeddingScore } from "../../utils/faceRecognition";
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
    options?: { isVerified?: boolean },
  ) {
    const faceEmbedding = dto.faceEmbedding;
    if (!faceEmbedding) {
      throw new ConflictError("Face embedding data required");
    }

    // Deduplication checks
    const byNationalId = await voterRepository.findByNationalId(dto.nationalId);

    // 1:N fuzzy biometric check
    const allVoters = await prisma.voter.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, faceEmbedding: true },
    });

    for (const v of allVoters) {
      if (v.faceEmbedding) {
        try {
          const decrypted = decrypt(v.faceEmbedding);
          const score = computeFaceEmbeddingScore(faceEmbedding, decrypted);
          if (score >= 85) {
            throw new ConflictError(
              `Face duplicate detected: matches existing voter "${v.fullName}" with score of ${score}%`,
            );
          }
        } catch (e: any) {
          if (e instanceof ConflictError) throw e;
          // Ignore decryption failures for corrupted/legacy database records
        }
      }
    }

    const faceEmbeddingHash = sha256(faceEmbedding);
    const byBiometric =
      await voterRepository.findByBiometricHash(faceEmbeddingHash);
    if (byBiometric)
      throw new ConflictError("Face embedding data already registered");

    assertUserScopeAccess(
      requester,
      { regionId: dto.regionId, districtId: dto.districtId },
      "voters",
    );

    const voterData = {
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
      faceEmbedding: encrypt(faceEmbedding), // AES-256 encrypted
      faceEmbeddingHash, // SHA-256 for lookup
      // Auto-verify registrations by default to allow immediate biometric login
      isVerified: options?.isVerified ?? true,
      createdBy: actorId,
    };

    const voter = byNationalId
      ? await voterRepository.update(byNationalId.id, voterData)
      : await voterRepository.create(voterData);

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "Voter",
      entityId: voter.id,
      description: byNationalId
        ? "Voter face embedding updated"
        : "Voter registered",
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

  async verify(
    id: string,
    verified: boolean,
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
      isVerified: verified,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Voter",
      entityId: id,
      description: `Voter verification status set to ${verified}`,
      ipAddress: ip,
    });

    return updated;
  },

  async exportCsv(q: VoterQuery, requester?: JwtPayload) {
    const scopedQuery = applyUserScope(q, requester);
    // Fetch all matching voters for export
    const rows = await voterRepository.findAllForExport(scopedQuery as any);

    // Build CSV header
    const header = [
      "Voter ID",
      "Full Name",
      "National ID",
      "Date of Birth",
      "Gender",
      "Phone",
      "Email",
      "Region ID",
      "District ID",
      "Polling Station ID",
      "Is Verified",
      "Registration Date",
    ];

    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s =
        typeof v === "string"
          ? v
          : v instanceof Date
            ? v.toISOString()
            : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [header.map(escape).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.voterId,
          r.fullName,
          r.nationalId,
          r.dateOfBirth
            ? new Date(r.dateOfBirth).toISOString().split("T")[0]
            : "",
          r.gender || "",
          r.phone || "",
          r.email || "",
          r.regionId || "",
          r.districtId || "",
          r.pollingStationId || "",
          r.isVerified ? "true" : "false",
          r.registrationDate ? new Date(r.registrationDate).toISOString() : "",
        ]
          .map(escape)
          .join(","),
      );
    }

    return lines.join("\n");
  },
};
