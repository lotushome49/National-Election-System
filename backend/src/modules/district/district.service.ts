import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { applyUserScope, assertUserScopeAccess } from "../../utils/scope";
import { auditService } from "../audit/audit.service";
import { regionRepository } from "../region/region.repository";
import type { JwtPayload } from "../../types";
import { districtRepository } from "./district.repository";
import type {
  CreateDistrictDto,
  DistrictQuery,
  UpdateDistrictDto,
} from "./district.schema";

export const districtService = {
  async list(q: DistrictQuery, requester?: JwtPayload) {
    const scopedQuery =
      requester?.role === "DISTRICT_ADMIN" ? q : applyUserScope(q, requester);
    const { data, total } = await districtRepository.findAll(scopedQuery);
    return {
      data,
      meta: buildPaginationMeta(total, scopedQuery.page, scopedQuery.limit),
    };
  },

  async getById(id: string, requester?: JwtPayload) {
    const district = await districtRepository.findById(id);
    if (!district) throw new NotFoundError("District");
    assertUserScopeAccess(
      requester,
      { regionId: district.regionId, districtId: district.id },
      "districts",
    );
    return district;
  },

  async create(
    dto: CreateDistrictDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    assertUserScopeAccess(requester, { regionId: dto.regionId }, "districts");

    const region = await regionRepository.findById(dto.regionId);
    if (!region) throw new NotFoundError("Region");

    if (await districtRepository.findByCode(dto.code)) {
      throw new ConflictError("District code already exists");
    }
    if (await districtRepository.findByNameInRegion(dto.name, dto.regionId)) {
      throw new ConflictError("District name already exists in this region");
    }

    const district = await districtRepository.create({
      ...dto,
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "District",
      entityId: district.id,
      newValues: dto,
      ipAddress: ip,
    });

    return district;
  },

  async update(
    id: string,
    dto: UpdateDistrictDto,
    actorId: string,
    ip: string,
    requester?: JwtPayload,
  ) {
    const existing = await districtRepository.findById(id);
    if (!existing) throw new NotFoundError("District");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.id },
      "districts",
    );

    const targetRegionId = dto.regionId ?? existing.regionId;
    assertUserScopeAccess(
      requester,
      { regionId: targetRegionId, districtId: existing.id },
      "districts",
    );

    const region = await regionRepository.findById(targetRegionId);
    if (!region) throw new NotFoundError("Region");

    if (
      dto.code &&
      dto.code !== existing.code &&
      (await districtRepository.findByCode(dto.code))
    ) {
      throw new ConflictError("District code already exists");
    }
    if (
      dto.name &&
      (dto.name !== existing.name || targetRegionId !== existing.regionId)
    ) {
      const conflict = await districtRepository.findByNameInRegion(
        dto.name,
        targetRegionId,
      );
      if (conflict && conflict.id !== existing.id) {
        throw new ConflictError("District name already exists in this region");
      }
    }

    const updated = await districtRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "District",
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
    const existing = await districtRepository.findById(id);
    if (!existing) throw new NotFoundError("District");
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.id },
      "districts",
    );

    const stationCount = await districtRepository.countPollingStations(id);
    if (stationCount > 0) {
      throw new BadRequestError(
        "Cannot delete a district that still has polling stations",
      );
    }

    await districtRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "District",
      entityId: id,
      description: "District soft-deleted",
      ipAddress: ip,
    });
  },
};
