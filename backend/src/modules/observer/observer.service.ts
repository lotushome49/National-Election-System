import { v4 as uuidv4 } from "uuid";
import { observerRepository } from "./observer.repository";
import { NotFoundError, ForbiddenError } from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { auditService } from "../audit/audit.service";
import { ROLES, type JwtPayload } from "../../types";
import type {
  CreateReportDto,
  UpdateReportStatusDto,
  ReportQuery,
} from "./observer.schema";

export const observerService = {
  async list(q: ReportQuery, viewer?: JwtPayload) {
    const nextQuery =
      viewer?.role === ROLES.OBSERVER ? { ...q, observerId: viewer.sub } : q;

    const { data, total } = await observerRepository.findAll(nextQuery);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string, viewer?: JwtPayload) {
    const report = await observerRepository.findById(id);
    if (!report) throw new NotFoundError("Observer report");

    if (viewer?.role === ROLES.OBSERVER && report.observerId !== viewer.sub) {
      throw new ForbiddenError("You can only view your own reports");
    }

    return report;
  },

  async create(dto: CreateReportDto, observerId: string, ip: string) {
    const report = await observerRepository.create({
      id: uuidv4(),
      ...dto,
      observerId,
      status: "SUBMITTED",
      evidenceUrls: dto.evidenceUrls ?? [],
    });

    if (dto.evidenceIds?.length) {
      const evidence = await observerRepository.findEvidenceByIds(
        dto.evidenceIds,
      );
      if (evidence.length !== dto.evidenceIds.length) {
        throw new NotFoundError("One or more evidence files");
      }

      if (evidence.some((item) => item.uploadedBy !== observerId)) {
        throw new ForbiddenError("You can only attach your own evidence files");
      }

      await observerRepository.attachEvidenceToReport(
        dto.evidenceIds,
        report.id,
      );

      const mergedUrls = Array.from(
        new Set([
          ...(dto.evidenceUrls ?? []),
          ...evidence.map((item) => item.publicUrl),
        ]),
      );

      await observerRepository.update(report.id, { evidenceUrls: mergedUrls });
    }

    await auditService.log({
      userId: observerId,
      action: "OBSERVER_REPORT_SUBMITTED",
      entity: "ObserverReport",
      entityId: report.id,
      description: `${dto.type}: ${dto.title}`,
      ipAddress: ip,
    });

    return report;
  },

  async updateStatus(
    id: string,
    dto: UpdateReportStatusDto,
    actorId: string,
    ip: string,
  ) {
    const existing = await observerRepository.findById(id);
    if (!existing) throw new NotFoundError("Observer report");

    const updated = await observerRepository.update(id, {
      status: dto.status,
      resolution: dto.resolution,
      resolvedBy: ["RESOLVED", "DISMISSED"].includes(dto.status)
        ? actorId
        : undefined,
      resolvedAt: ["RESOLVED", "DISMISSED"].includes(dto.status)
        ? new Date()
        : undefined,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "ObserverReport",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: dto.status },
      ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, actorRole: string, ip: string) {
    const existing = await observerRepository.findById(id);
    if (!existing) throw new NotFoundError("Observer report");

    // Only the submitting observer or an admin can delete
    if (
      existing.observerId !== actorId &&
      actorRole !== ROLES.ADMIN &&
      actorRole !== ROLES.SUPER_ADMIN
    ) {
      throw new ForbiddenError("You can only delete your own reports");
    }

    await observerRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "ObserverReport",
      entityId: id,
      ipAddress: ip,
    });
  },
};
