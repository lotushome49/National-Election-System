import { prisma } from "../../configs/database";
import type { VoterQuery } from "./voter.schema";

export const voterRepository = {
  findAll: async (q: VoterQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.regionId && { regionId: q.regionId }),
      ...(q.districtId && { districtId: q.districtId }),
      ...(q.pollingStationId && { pollingStationId: q.pollingStationId }),
      ...(q.isVerified !== undefined && { isVerified: q.isVerified }),
      ...(q.search && {
        OR: [
          { fullName: { contains: q.search } },
          { voterId: { contains: q.search } },
          { nationalId: { contains: q.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        select: {
          id: true,
          voterId: true,
          fullName: true,
          dateOfBirth: true,
          gender: true,
          phone: true,
          email: true,
          regionId: true,
          districtId: true,
          pollingStationId: true,
          isVerified: true,
          registrationDate: true,
          createdAt: true,
        },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { registrationDate: "desc" },
      }),
      prisma.voter.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.voter.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        voterId: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        email: true,
        address: true,
        regionId: true,
        districtId: true,
        pollingStationId: true,
        isVerified: true,
        registrationDate: true,
      },
    }),

  findByNationalId: (nationalId: string) =>
    prisma.voter.findFirst({ where: { nationalId, deletedAt: null } }),

  findByBiometricHash: (hash: string) =>
    prisma.voter.findFirst({
      where: { faceEmbeddingHash: hash, deletedAt: null },
    }),

  create: (data: any) => prisma.voter.create({ data }),

  update: (id: string, data: any) =>
    prisma.voter.update({ where: { id }, data }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.voter.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    }),
};
