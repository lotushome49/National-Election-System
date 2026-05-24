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

  // Create a working default system admin so the documented login is always valid.
  const superAdminRole = await prisma.role.findUnique({
    where: { code: "SUPER_ADMIN" },
  });
  if (!superAdminRole)
    throw new Error("SUPER_ADMIN role not found after seeding");

  const defaultAuthAccounts = [
    {
      username: "superadmin",
      email: "superadmin@election.gov.et",
      fullName: "System Super Admin",
    },
    {
      username: "admin",
      email: "admin@election.gov.et",
      fullName: "System Admin",
    },
    {
      username: "regional",
      email: "regional@election.gov.et",
      fullName: "Regional Admin",
    },
    {
      username: "district",
      email: "district@election.gov.et",
      fullName: "District Admin",
    },
    {
      username: "staff",
      email: "staff@election.gov.et",
      fullName: "Election Staff",
    },
    {
      username: "observer",
      email: "observer@election.gov.et",
      fullName: "Election Observer",
    },
    { username: "voter", email: "voter@election.gov.et", fullName: "Voter" },
  ];
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  for (const account of defaultAuthAccounts) {
    const existingUser = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ username: account.username }, { email: account.email }],
      },
    });

    if (existingUser) continue;

    await prisma.user.create({
      data: {
        id: uuidv4(),
        roleId: superAdminRole.id,
        fullName: account.fullName,
        username: account.username,
        email: account.email,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }
  console.log(
    "  ✅ Default auth accounts ensured: superadmin/admin/regional/district/staff/observer/voter",
  );

  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // SAMPLE GEOGRAPHY DATA (Regions, Districts, Polling Stations)
  // ---------------------------------------------------------
  const sampleRegions = [
    { name: "Addis Ababa", code: "AA", description: "Capital city" },
    { name: "Oromia", code: "OR", description: "Largest region" },
  ];

  const regionMap = {} as Record<string, string>; // code -> id

  for (const region of sampleRegions) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name, description: region.description },
      create: {
        id: uuidv4(),
        name: region.name,
        code: region.code,
        description: region.description,
      },
    });
    regionMap[region.code] = created.id;
    console.log(`  ✅ Region created: ${region.name}`);
  }

  const sampleDistricts = [
    { name: "Bole", code: "BO", regionCode: "AA" },
    { name: "Nifas Silk", code: "NS", regionCode: "AA" },
    { name: "Arsi", code: "AR", regionCode: "OR" },
  ];

  const districtMap = {} as Record<string, string>; // code -> id

  for (const district of sampleDistricts) {
    const created = await prisma.district.upsert({
      where: { code: district.code },
      update: { name: district.name },
      create: {
        id: uuidv4(),
        name: district.name,
        code: district.code,
        regionId: regionMap[district.regionCode],
      },
    });
    districtMap[district.code] = created.id;
    console.log(`  ✅ District created: ${district.name}`);
  }

  const samplePollingStations = [
    { name: "Bole Center", code: "BOC1", districtCode: "BO", regionCode: "AA" },
    {
      name: "Nifas Silk Center",
      code: "NSC1",
      districtCode: "NS",
      regionCode: "AA",
    },
    {
      name: "Arsi Central",
      code: "ARC1",
      districtCode: "AR",
      regionCode: "OR",
    },
  ];

  for (const ps of samplePollingStations) {
    await prisma.pollingStation.upsert({
      where: { code: ps.code },
      update: { name: ps.name },
      create: {
        id: uuidv4(),
        name: ps.name,
        code: ps.code,
        districtId: districtMap[ps.districtCode],
        regionId: regionMap[ps.regionCode],
      },
    });
    console.log(`  ✅ Polling Station created: ${ps.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
