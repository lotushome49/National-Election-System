import { v4 as uuidv4 } from "uuid";
import { candidateRepository } from "./candidate.repository";
import { electionRepository } from "../election/election.repository";
import { NotFoundError, BadRequestError } from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { applyUserScope, assertUserScopeAccess } from "../../utils/scope";
import { auditService } from "../audit/audit.service";
import type { JwtPayload } from "../../types";
import fs from "fs/promises";
import path from "path";
import { sha256 } from "../../utils/crypto";
import { getCandidateUploadRoot } from "./candidate.upload";
import type {
  CreateCandidateDto,
  UpdateCandidateDto,
  CandidateStatusDto,
  CandidateQuery,
} from "./candidate.schema";

export const candidateService = {
  async list(q: CandidateQuery, requester?: JwtPayload) {
    const scopedQuery = applyUserScope(q, requester);
    const { data, total } = await candidateRepository.findAll(scopedQuery);
    return {
      data,
      meta: buildPaginationMeta(total, scopedQuery.page, scopedQuery.limit),
    };
  },

  async getById(id: string, requester?: JwtPayload) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) throw new NotFoundError("Candidate");
    assertUserScopeAccess(
      requester,
      { regionId: candidate.regionId, districtId: candidate.districtId },
      "candidates",
    );
    return candidate;
  },

  async create(
    dto: CreateCandidateDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const election = await electionRepository.findById(dto.electionId);
    if (!election) throw new NotFoundError("Election");

    if (!["NOMINATION_OPEN", "NOMINATION_CLOSED"].includes(election.status)) {
      throw new BadRequestError(
        "Candidates can only be added during the nomination phase",
      );
    }

    assertUserScopeAccess(
      requester,
      { regionId: dto.regionId, districtId: dto.districtId },
      "candidates",
    );

    const candidate = await candidateRepository.create({
      id: uuidv4(),
      ...dto,
      status: "PENDING",
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "Candidate",
      entityId: candidate.id,
      newValues: { fullName: dto.fullName, party: dto.party },
      ipAddress: ip,
    });

    return candidate;
  },

  async update(
    id: string,
    dto: UpdateCandidateDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError("Candidate");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      "candidates",
    );

    const updated = await candidateRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Candidate",
      entityId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: ip,
    });

    return updated;
  },

  async updateStatus(
    id: string,
    dto: CandidateStatusDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError("Candidate");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      "candidates",
    );

    const updated = await candidateRepository.update(id, {
      status: dto.status,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Candidate",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: dto.status },
      description: dto.reason,
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
    const existing = await candidateRepository.findById(id);
    if (!existing) throw new NotFoundError("Candidate");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      "candidates",
    );

    await candidateRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "Candidate",
      entityId: id,
      description: "Candidate soft-deleted",
      ipAddress: ip,
    });
  },

  async uploadDocuments(
    id: string,
    files: Express.Multer.File[],
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) throw new NotFoundError("Candidate");

    assertUserScopeAccess(
      requester,
      { regionId: candidate.regionId, districtId: candidate.districtId },
      "candidates",
    );

    const existingDocs = candidate.documentsJson
      ? JSON.parse(candidate.documentsJson)
      : [];

    const newDocs = [] as any[];
    for (const file of files) {
      const ext = path.extname(file.originalname) || "";
      const fileName = `${Date.now()}-${uuidv4()}${ext}`;
      const storagePath = path.join(getCandidateUploadRoot(), fileName);
      await fs.writeFile(storagePath, file.buffer);

      const docMetadata = {
        id: uuidv4(),
        originalName: file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_"),
        fileName,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        publicUrl: `/uploads/candidate-docs/${fileName}`,
        checksum: sha256(file.buffer.toString("base64")),
        uploadedAt: new Date().toISOString(),
      };
      newDocs.push(docMetadata);
    }

    const updatedDocs = [...existingDocs, ...newDocs];
    const updated = await candidateRepository.update(id, {
      documentsJson: JSON.stringify(updatedDocs),
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Candidate",
      entityId: id,
      newValues: { documents: newDocs.map(d => d.originalName) },
      description: "Candidate credentials uploaded",
      ipAddress: ip,
    });

    return updated;
  },
};
