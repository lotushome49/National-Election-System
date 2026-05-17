import { BadRequestError, ConflictError, NotFoundError } from '../../errors/AppError';
import { buildPaginationMeta } from '../../utils/response';
import { applyUserScope, assertUserScopeAccess } from '../../utils/scope';
import { auditService } from '../audit/audit.service';
import { districtRepository } from '../district/district.repository';
import { regionRepository } from '../region/region.repository';
import type { JwtPayload } from '../../types';
import { pollingStationRepository } from './pollingStation.repository';
import type {
  CreatePollingStationDto,
  PollingStationQuery,
  UpdatePollingStationDto,
} from './pollingStation.schema';

export const pollingStationService = {
  async list(q: PollingStationQuery, requester?: JwtPayload) {
    const scopedQuery = applyUserScope(q, requester);
    const { data, total } = await pollingStationRepository.findAll(scopedQuery);
    return {
      data,
      meta: buildPaginationMeta(total, scopedQuery.page, scopedQuery.limit),
    };
  },

  async getById(id: string, requester?: JwtPayload) {
    const pollingStation = await pollingStationRepository.findById(id);
    if (!pollingStation) throw new NotFoundError('Polling station');
    assertUserScopeAccess(
      requester,
      { regionId: pollingStation.regionId, districtId: pollingStation.districtId },
      'polling stations',
    );
    return pollingStation;
  },

  async create(dto: CreatePollingStationDto, actorId: string, ip: string, requester?: JwtPayload) {
    assertUserScopeAccess(
      requester,
      { regionId: dto.regionId, districtId: dto.districtId },
      'polling stations',
    );

    const [region, district] = await Promise.all([
      regionRepository.findById(dto.regionId),
      districtRepository.findById(dto.districtId),
    ]);

    if (!region) throw new NotFoundError('Region');
    if (!district) throw new NotFoundError('District');
    if (district.regionId !== dto.regionId) {
      throw new BadRequestError('District does not belong to the selected region');
    }

    if (await pollingStationRepository.findByCode(dto.code)) {
      throw new ConflictError('Polling station code already exists');
    }
    if (await pollingStationRepository.findByNameInDistrict(dto.name, dto.districtId)) {
      throw new ConflictError('Polling station name already exists in this district');
    }

    const pollingStation = await pollingStationRepository.create({ ...dto, createdBy: actorId });

    await auditService.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'PollingStation',
      entityId: pollingStation.id,
      newValues: dto,
      ipAddress: ip,
    });

    return pollingStation;
  },

  async update(id: string, dto: UpdatePollingStationDto, actorId: string, ip: string, requester?: JwtPayload) {
    const existing = await pollingStationRepository.findById(id);
    if (!existing) throw new NotFoundError('Polling station');

    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      'polling stations',
    );

    const targetRegionId = dto.regionId ?? existing.regionId;
    const targetDistrictId = dto.districtId ?? existing.districtId;

    assertUserScopeAccess(
      requester,
      { regionId: targetRegionId, districtId: targetDistrictId },
      'polling stations',
    );

    const [region, district] = await Promise.all([
      regionRepository.findById(targetRegionId),
      districtRepository.findById(targetDistrictId),
    ]);

    if (!region) throw new NotFoundError('Region');
    if (!district) throw new NotFoundError('District');
    if (district.regionId !== targetRegionId) {
      throw new BadRequestError('District does not belong to the selected region');
    }

    if (dto.code && dto.code !== existing.code && await pollingStationRepository.findByCode(dto.code)) {
      throw new ConflictError('Polling station code already exists');
    }
    if (dto.name && (dto.name !== existing.name || targetDistrictId !== existing.districtId)) {
      const conflict = await pollingStationRepository.findByNameInDistrict(dto.name, targetDistrictId);
      if (conflict && conflict.id !== existing.id) {
        throw new ConflictError('Polling station name already exists in this district');
      }
    }

    const updated = await pollingStationRepository.update(id, { ...dto, updatedBy: actorId });

    await auditService.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'PollingStation',
      entityId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string, requester?: JwtPayload) {
    const existing = await pollingStationRepository.findById(id);
    if (!existing) throw new NotFoundError('Polling station');
    assertUserScopeAccess(
      requester,
      { regionId: existing.regionId, districtId: existing.districtId },
      'polling stations',
    );

    await pollingStationRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: 'DELETE',
      entity: 'PollingStation',
      entityId: id,
      description: 'Polling station soft-deleted',
      ipAddress: ip,
    });
  },
};
