import { prisma } from '../../configs/database';
import type { CreateDistrictDto, DistrictQuery, UpdateDistrictDto } from './district.schema';

const districtSelect = {
  id: true,
  regionId: true,
  name: true,
  code: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  region: {
    select: { id: true, name: true, code: true },
  },
  _count: {
    select: {
      pollingStations: { where: { deletedAt: null } },
    },
  },
};

export const districtRepository = {
  findAll: async (q: DistrictQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.regionId && { regionId: q.regionId }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { code: { contains: q.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.district.findMany({
        where,
        select: districtSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: [{ region: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.district.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.district.findFirst({
      where: { id, deletedAt: null },
      select: districtSelect,
    }),

  findByCode: (code: string) =>
    prisma.district.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    }),

  findByNameInRegion: (name: string, regionId: string) =>
    prisma.district.findFirst({
      where: { name, regionId, deletedAt: null },
      select: { id: true },
    }),

  create: (dto: CreateDistrictDto & { createdBy: string }) =>
    prisma.district.create({
      data: {
        ...dto,
        updatedBy: dto.createdBy,
      },
      select: districtSelect,
    }),

  update: (id: string, dto: UpdateDistrictDto & { updatedBy: string }) =>
    prisma.district.update({
      where: { id },
      data: dto,
      select: districtSelect,
    }),

  countPollingStations: (districtId: string) =>
    prisma.pollingStation.count({
      where: { districtId, deletedAt: null },
    }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.district.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
