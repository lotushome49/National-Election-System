import bcrypt from "bcryptjs";
import { prisma } from "../configs/database";
import { env } from "../configs/env";

export async function ensureSystemAdminAccount(): Promise<void> {
  const superAdminRole = await prisma.role.findUnique({
    where: { code: "SUPER_ADMIN" },
  });

  if (!superAdminRole) {
    console.warn(
      "⚠️ SUPER_ADMIN role not found; skipping system admin bootstrap",
    );
    return;
  }

  const username = env.ADMIN_USERNAME || "admin";
  const email = env.ADMIN_EMAIL || "admin@example.com";
  const password = env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: {
      roleId: superAdminRole.id,
      fullName: "System Super Admin",
      email,
      passwordHash,
      status: "ACTIVE",
    },
    create: {
      roleId: superAdminRole.id,
      fullName: "System Super Admin",
      username,
      email,
      passwordHash,
      status: "ACTIVE",
    },
  });

  console.log(`✅ System admin account ready: ${username}`);
}
