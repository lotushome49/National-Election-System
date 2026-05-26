import { Response, NextFunction } from "express";
import { ForbiddenError } from "../errors/AppError";
import { ROLES, type AuthRequest, type Permission, type Role } from "../types";

// ─── Permission → allowed roles map ──────────────────────────────────────────
const PERMISSION_ROLES: Record<Permission, Role[]> = {
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_ELECTIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_CANDIDATES: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_VOTERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  CAST_VOTE: [ROLES.VOTER],
  VIEW_RESULTS: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.REGIONAL_ADMIN,
    ROLES.DISTRICT_ADMIN,
    ROLES.STAFF,
    ROLES.OBSERVER,
  ],
  MANAGE_REGIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_DISTRICTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISTRICT_ADMIN],
  MANAGE_POLLING_STATIONS: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DISTRICT_ADMIN,
  ],
  VIEW_AUDIT_LOGS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_OBSERVERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  GENERATE_REPORTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REGIONAL_ADMIN],
};

/**
 * requirePermission — checks that the authenticated user's role
 * has the specified permission.
 *
 * Usage: router.get('/...', authenticate, requirePermission('VIEW_RESULTS'), handler)
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(new ForbiddenError("Not authenticated"));

    const hasAll = permissions.every((perm) => {
      const allowed = PERMISSION_ROLES[perm] ?? [];
      return allowed.includes(user.role as Role);
    });

    if (!hasAll) {
      return next(
        new ForbiddenError(
          `Role '${user.role}' lacks required permission(s): ${permissions.join(", ")}`,
        ),
      );
    }

    next();
  };
}

/**
 * requireRole — checks that the user has one of the specified roles.
 *
 * Usage: router.get('/...', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(new ForbiddenError("Not authenticated"));

    if (!roles.includes(user.role as Role)) {
      return next(
        new ForbiddenError(
          `Role '${user.role}' is not authorised for this resource`,
        ),
      );
    }

    next();
  };
}

/**
 * scopeGuard — enforces hierarchical geographic scoping.
 * Regional admins can only access their own region.
 * District admins can only access their own district.
 */
export function scopeGuard(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const user = req.user;
  if (!user) return next(new ForbiddenError("Not authenticated"));

  const targetRegion = (req.body?.regionId ??
    req.query?.regionId ??
    req.params?.regionId) as string | undefined;
  const targetDistrict = (req.body?.districtId ??
    req.query?.districtId ??
    req.params?.districtId) as string | undefined;

  if (
    user.role === ROLES.REGIONAL_ADMIN &&
    targetRegion &&
    targetRegion !== user.regionId
  ) {
    return next(
      new ForbiddenError("Access restricted to your assigned region"),
    );
  }

  if (
    user.role === ROLES.DISTRICT_ADMIN &&
    targetDistrict &&
    targetDistrict !== user.districtId
  ) {
    return next(
      new ForbiddenError("Access restricted to your assigned district"),
    );
  }

  next();
}
