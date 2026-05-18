import { prisma } from "../../configs/database";

export const observerEvidenceRepository = {
  findMany: (where: any, skip: number, take: number) =>
    Promise.all([
      prisma.observerEvidence.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          uploader: { select: { id: true, fullName: true, username: true } },
          report: { select: { id: true, title: true } },
        },
      }),
      prisma.observerEvidence.count({ where }),
    ]),

  findById: (id: string) =>
    prisma.observerEvidence.findFirst({
      where: { id, deletedAt: null },
      include: {
        uploader: { select: { id: true, fullName: true, username: true } },
        report: { select: { id: true, title: true } },
      },
    }),

  findByIds: (ids: string[]) =>
    prisma.observerEvidence.findMany({
      where: { id: { in: ids }, deletedAt: null },
    }),

  create: (data: any) => prisma.observerEvidence.create({ data }),

  attachToReport: (ids: string[], reportId: string) =>
    prisma.observerEvidence.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { reportId },
    }),

  softDelete: (id: string) =>
    prisma.observerEvidence.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
};
