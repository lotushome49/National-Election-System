import type { Role } from "../types/election";

export const HAS_PERMISSION = {
  MANAGE_USERS: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_ELECTIONS: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_CANDIDATES: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_VOTERS: ["SUPER_ADMIN", "ADMIN", "DISTRICT_ADMIN", "STAFF"],
  CAST_VOTE: ["VOTER"],
  VIEW_RESULTS: [
    "SUPER_ADMIN",
    "ADMIN",
    "REGIONAL_ADMIN",
    "DISTRICT_ADMIN",
    "STAFF",
    "OBSERVER",
  ],
  MANAGE_REGIONS: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_DISTRICTS: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_POLLING_STATIONS: ["SUPER_ADMIN", "ADMIN", "DISTRICT_ADMIN"],
  VIEW_AUDIT_LOGS: ["SUPER_ADMIN", "ADMIN"],
  MANAGE_OBSERVERS: ["SUPER_ADMIN", "ADMIN"],
  GENERATE_REPORTS: ["SUPER_ADMIN", "ADMIN", "REGIONAL_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export const checkPerm = (
  role: Role,
  permission: keyof typeof HAS_PERMISSION,
) => (HAS_PERMISSION[permission] as readonly Role[]).includes(role);
