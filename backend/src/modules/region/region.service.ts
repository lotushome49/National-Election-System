import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { auditService } from "../audit/audit.service";
import { regionRepository } from "./region.repository";
import type {
  CreateRegionDto,
  RegionQuery,
  UpdateRegionDto,
} from "./region.schema";
import type { JwtPayload } from "../../types";

export const regionService = {
  async list(q: RegionQuery, requester?: JwtPayload) {
    const { data, total } = await regionRepository.findAll(q);
    if (requester?.role === "REGIONAL_ADMIN" && requester.regionId) {
      const scopedData = data.filter(
        (region) => region.id === requester.regionId,
      );
      return {
        data: scopedData,
        meta: buildPaginationMeta(scopedData.length, q.page, q.limit),
      };
    }

    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string, requester?: JwtPayload) {
    const region = await regionRepository.findById(id);
    if (!region) throw new NotFoundError("Region");

    if (
      requester?.role === "REGIONAL_ADMIN" &&
      requester.regionId &&
      region.id !== requester.regionId
    ) {
      throw new ForbiddenError("Access restricted to your assigned region");
    }

    return region;
  },

  async create(
    dto: CreateRegionDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    void requester;
    if (await regionRepository.findByName(dto.name)) {
      throw new ConflictError("Region name already exists");
    }

    if (await regionRepository.findByCode(dto.code)) {
      throw new ConflictError("Region code already exists");
    }

    const region = await regionRepository.create({
      ...dto,
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "Region",
      entityId: region.id,
      newValues: dto,
      ipAddress: ip,
    });

    return region;
  },

  async update(
    id: string,
    dto: UpdateRegionDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    void requester;
    const existing = await regionRepository.findById(id);
    if (!existing) throw new NotFoundError("Region");

    if (
      dto.name &&
      dto.name !== existing.name &&
      (await regionRepository.findByName(dto.name))
    ) {
      throw new ConflictError("Region name already exists");
    }

    if (
      dto.code &&
      dto.code !== existing.code &&
      (await regionRepository.findByCode(dto.code))
    ) {
      throw new ConflictError("Region code already exists");
    }

    const updated = await regionRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Region",
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
    void requester;
    const existing = await regionRepository.findById(id);
    if (!existing) throw new NotFoundError("Region");

    const [districtCount, stationCount] = await Promise.all([
      regionRepository.countDistricts(id),
      regionRepository.countPollingStations(id),
    ]);

    if (districtCount > 0 || stationCount > 0) {
      throw new BadRequestError(
        "Cannot delete a region that still has districts or polling stations",
      );
    }

    await regionRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "Region",
      entityId: id,
      description: "Region soft-deleted",
      ipAddress: ip,
    });
  },
};
