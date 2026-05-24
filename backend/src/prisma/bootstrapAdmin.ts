import bcrypt from "bcryptjs";
import { prisma } from "../configs/database";
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

  console.log(
    "✅ SUPER_ADMIN role available; using real users table for login",
  );
}
