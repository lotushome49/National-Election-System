import { prisma } from '../../configs/database';
import type {
  CreatePollingStationDto,
  PollingStationQuery,
  UpdatePollingStationDto,
} from './pollingStation.schema';

const pollingStationSelect = {
  id: true,
  regionId: true,
  districtId: true,
  name: true,
  code: true,
  address: true,
  latitude: true,
  longitude: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  region: {
    select: { id: true, name: true, code: true },
  },
  district: {
    select: { id: true, name: true, code: true, regionId: true },
  },
  _count: {
    select: {
      voters: { where: { deletedAt: null } },
      observerReports: { where: { deletedAt: null } },
    },
  },
};

export const pollingStationRepository = {
  findAll: async (q: PollingStationQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.regionId && { regionId: q.regionId }),
      ...(q.districtId && { districtId: q.districtId }),
      ...(q.isActive !== undefined && { isActive: q.isActive }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { code: { contains: q.search } },
          { address: { contains: q.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.pollingStation.findMany({
        where,
        select: pollingStationSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: [{ region: { name: 'asc' } }, { district: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.pollingStation.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.pollingStation.findFirst({
      where: { id, deletedAt: null },
      select: pollingStationSelect,
    }),

  findByCode: (code: string) =>
    prisma.pollingStation.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    }),

  findByNameInDistrict: (name: string, districtId: string) =>
    prisma.pollingStation.findFirst({
      where: { name, districtId, deletedAt: null },
      select: { id: true },
    }),

  create: (dto: CreatePollingStationDto & { createdBy: string }) =>
    prisma.pollingStation.create({
      data: {
        ...dto,
        updatedBy: dto.createdBy,
      },
      select: pollingStationSelect,
    }),

  update: (id: string, dto: UpdatePollingStationDto & { updatedBy: string }) =>
    prisma.pollingStation.update({
      where: { id },
      data: dto,
      select: pollingStationSelect,
    }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.pollingStation.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
