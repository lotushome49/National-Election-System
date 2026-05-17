import { v4 as uuidv4 } from 'uuid';
import { observerRepository } from './observer.repository';
import { NotFoundError, ForbiddenError } from '../../errors/AppError';
import { buildPaginationMeta } from '../../utils/response';
import { auditService } from '../audit/audit.service';
import type { CreateReportDto, UpdateReportStatusDto, ReportQuery } from './observer.schema';

export const observerService = {
  async list(q: ReportQuery) {
    const { data, total } = await observerRepository.findAll(q);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string) {
    const report = await observerRepository.findById(id);
    if (!report) throw new NotFoundError('Observer report');
    return report;
  },

  async create(dto: CreateReportDto, observerId: string, ip: string) {
    const report = await observerRepository.create({
      id: uuidv4(),
      ...dto,
      observerId,
      status: 'SUBMITTED',
      evidenceUrls: dto.evidenceUrls ?? [],
    });

    await auditService.log({
      userId: observerId, action: 'OBSERVER_REPORT_SUBMITTED',
      entity: 'ObserverReport', entityId: report.id,
      description: `${dto.type}: ${dto.title}`, ipAddress: ip,
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
    if (!existing) throw new NotFoundError('Observer report');

    const updated = await observerRepository.update(id, {
      status:     dto.status,
      resolution: dto.resolution,
      resolvedBy: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? actorId : undefined,
      resolvedAt: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? new Date() : undefined,
    });

    await auditService.log({
      userId: actorId, action: 'UPDATE', entity: 'ObserverReport', entityId: id,
      oldValues: { status: existing.status }, newValues: { status: dto.status },
      ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string) {
    const existing = await observerRepository.findById(id);
    if (!existing) throw new NotFoundError('Observer report');

    // Only the submitting observer or an admin can delete
    if (existing.observerId !== actorId) {
      throw new ForbiddenError('You can only delete your own reports');
    }

    await observerRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId, action: 'DELETE', entity: 'ObserverReport',
      entityId: id, ipAddress: ip,
    });
  },
};
