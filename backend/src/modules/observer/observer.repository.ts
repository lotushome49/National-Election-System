import { prisma } from "../../configs/database";
import type { ReportQuery } from "./observer.schema";

export const observerRepository = {
  findAll: async (q: ReportQuery) => {
    const where: any = {
      deletedAt: null,
      ...(q.electionId && { electionId: q.electionId }),
      ...(q.pollingStationId && { pollingStationId: q.pollingStationId }),
      ...(q.type && { type: q.type }),
      ...(q.status && { status: q.status }),
      ...(q.observerId && { observerId: q.observerId }),
    };

    const [data, total] = await Promise.all([
      prisma.observerReport.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        include: {
          observer: { select: { id: true, fullName: true, username: true } },
          evidenceItems: true,
        },
      }),
      prisma.observerReport.count({ where }),
    ]);

    return { data, total };
  },

  findById: (id: string) =>
    prisma.observerReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        observer: { select: { id: true, fullName: true } },
        evidenceItems: true,
      },
    }),

  create: (data: any) => prisma.observerReport.create({ data }),

  update: (id: string, data: any) =>
    prisma.observerReport.update({ where: { id }, data }),

  softDelete: (id: string, deletedBy: string) =>
    prisma.observerReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),

  findEvidenceByIds: (ids: string[]) =>
    prisma.observerEvidence.findMany({
      where: { id: { in: ids }, deletedAt: null },
    }),

  attachEvidenceToReport: (ids: string[], reportId: string) =>
    prisma.observerEvidence.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { reportId },
    }),
};
