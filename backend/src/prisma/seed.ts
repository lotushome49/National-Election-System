import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { createDemoFaceEmbedding } from "../utils/faceRecognition";

const prisma = new PrismaClient();

const ROLES = [
  {
    code: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Full system access",
  },
  { code: "ADMIN", name: "Administrator", description: "National-level admin" },
  {
    code: "REGIONAL_ADMIN",
    name: "Regional Admin",
    description: "Manages a single region",
  },
  {
    code: "DISTRICT_ADMIN",
    name: "District Admin",
    description: "Manages a single district",
  },
  {
    code: "STAFF",
    name: "Election Staff",
    description: "Polling station staff",
  },
  {
    code: "OBSERVER",
    name: "Election Observer",
    description: "Accredited observer",
  },
  { code: "VOTER", name: "Voter", description: "Registered voter" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "MANAGE_USERS",
    "MANAGE_ELECTIONS",
    "MANAGE_CANDIDATES",
    "MANAGE_VOTERS",
    "VIEW_RESULTS",
    "MANAGE_REGIONS",
    "MANAGE_DISTRICTS",
    "MANAGE_POLLING_STATIONS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_OBSERVERS",
    "GENERATE_REPORTS",
  ],
  ADMIN: [
    "MANAGE_USERS",
    "MANAGE_ELECTIONS",
    "MANAGE_CANDIDATES",
    "MANAGE_VOTERS",
    "VIEW_RESULTS",
    "MANAGE_REGIONS",
    "MANAGE_DISTRICTS",
    "MANAGE_POLLING_STATIONS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_OBSERVERS",
    "GENERATE_REPORTS",
  ],
  REGIONAL_ADMIN: [
    "MANAGE_VOTERS",
    "VIEW_RESULTS",
    "MANAGE_DISTRICTS",
    "MANAGE_POLLING_STATIONS",
    "GENERATE_REPORTS",
  ],
  DISTRICT_ADMIN: ["MANAGE_VOTERS", "VIEW_RESULTS", "MANAGE_POLLING_STATIONS"],
  STAFF: ["MANAGE_VOTERS", "VIEW_RESULTS"],
  OBSERVER: ["VIEW_RESULTS", "MANAGE_OBSERVERS"],
  VOTER: ["CAST_VOTE", "VIEW_RESULTS"],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert roles and permissions
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { code: role.code as any },
      update: { name: role.name, description: role.description },
      create: {
        id: uuidv4(),
        code: role.code as any,
        name: role.name,
        description: role.description,
      },
    });

    for (const perm of ROLE_PERMISSIONS[role.code] ?? []) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permission: { roleId: created.id, permission: perm as any },
        },
        update: {},
        create: { id: uuidv4(), roleId: created.id, permission: perm as any },
      });
    }
    console.log(`  ✅ Role: ${role.name}`);
  }

  // Create default super admin if env vars are set
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const superAdminRole = await prisma.role.findUnique({
      where: { code: "SUPER_ADMIN" },
    });
    if (!superAdminRole)
      throw new Error("SUPER_ADMIN role not found after seeding");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { username: "superadmin" },
      update: {},
      create: {
        id: uuidv4(),
        roleId: superAdminRole.id,
        fullName: "System Super Admin",
        username: "superadmin",
        email: adminEmail,
        passwordHash,
        status: "ACTIVE",
      },
    });
    console.log(`  ✅ Super admin created: ${adminEmail}`);
  }

  // Create dev test voter for dummy face login
  if (process.env.DUMMY_BIO_HASH) {
    const testVoter = await prisma.voter.upsert({
      where: { voterId: "DEVVOTER001" },
      update: {},
      create: {
        id: uuidv4(),
        voterId: "DEVVOTER001",
        nationalId: "DEVNATID001",
        fullName: "Dev Test Voter",
        dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
        email: "dev@example.com",
        faceEmbedding: createDemoFaceEmbedding(process.env.DUMMY_BIO_HASH),
        faceEmbeddingHash: process.env.DUMMY_BIO_HASH,
        isVerified: true,
      },
    });
    console.log(`  ✅ Test voter created: ${testVoter.email}`);
  }

  console.log("✅ Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
