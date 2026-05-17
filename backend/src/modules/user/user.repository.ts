import { prisma } from '../../configs/database';
import type { CreateUserDto, UpdateUserDto, UserQuery } from './user.schema';

const userSelect = {
  id: true, fullName: true, username: true, email: true,
  status: true, assignedRegionId: true, assignedDistrictId: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  role: { select: { id: true, code: true, name: true } },
};

export const userRepository = {
  findAll: async (q: UserQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.status   && { status: q.status }),
      ...(q.regionId && { assignedRegionId: q.regionId }),
      ...(q.role     && { role: { code: q.role } }),
      ...(q.search   && {
        OR: [
          { fullName: { contains: q.search } },
          { username: { contains: q.search } },
          { email:    { contains: q.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        skip:  (q.page - 1) * q.limit,
        take:  q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect }),

  findByUsername: (username: string) =>
    prisma.user.findFirst({ where: { username, deletedAt: null } }),

  create: (dto: CreateUserDto & { passwordHash: string; createdBy: string }) =>
    prisma.user.create({
      data: {
        id:                 crypto.randomUUID(),
        fullName:           dto.fullName,
        username:           dto.username,
        email:              dto.email,
        passwordHash:       dto.passwordHash,
        roleId:             dto.roleId,
        assignedRegionId:   dto.assignedRegionId,
        assignedDistrictId: dto.assignedDistrictId,
        createdBy:          dto.createdBy,
      },
      select: userSelect,
    }),

  update: (id: string, dto: UpdateUserDto & { updatedBy: string }) =>
    prisma.user.update({
      where: { id },
      data:  { ...dto, updatedBy: dto.updatedBy },
      select: userSelect,
    }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
