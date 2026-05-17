import { prisma } from '../../configs/database';
import type { CreateRegionDto, RegionQuery, UpdateRegionDto } from './region.schema';

const regionSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      districts: { where: { deletedAt: null } },
      pollingStations: { where: { deletedAt: null } },
    },
  },
};

export const regionRepository = {
  findAll: async (q: RegionQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { code: { contains: q.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.region.findMany({
        where,
        select: regionSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.region.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.region.findFirst({
      where: { id, deletedAt: null },
      select: regionSelect,
    }),

  findByName: (name: string) =>
    prisma.region.findFirst({
      where: { name, deletedAt: null },
      select: { id: true },
    }),

  findByCode: (code: string) =>
    prisma.region.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    }),

  create: (dto: CreateRegionDto & { createdBy: string }) =>
    prisma.region.create({
      data: {
        ...dto,
        updatedBy: dto.createdBy,
      },
      select: regionSelect,
    }),

  update: (id: string, dto: UpdateRegionDto & { updatedBy: string }) =>
    prisma.region.update({
      where: { id },
      data: dto,
      select: regionSelect,
    }),

  countDistricts: (regionId: string) =>
    prisma.district.count({
      where: { regionId, deletedAt: null },
    }),

  countPollingStations: (regionId: string) =>
    prisma.pollingStation.count({
      where: { regionId, deletedAt: null },
    }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.region.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
