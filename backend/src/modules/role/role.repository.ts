import { prisma } from "../../configs/database";

export const roleRepository = {
  findAll: async () =>
    prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    }),
};
