import { ForbiddenError } from "../errors/AppError";
import { ROLES, type JwtPayload } from "../types";

type ScopeTarget = {
  regionId?: string | null;
  districtId?: string | null;
};

export function applyUserScope<T extends Record<string, unknown>>(
  input: T,
  user?: JwtPayload,
): T {
  if (!user) return input;

  const scoped = { ...input } as Record<string, unknown>;

  if (user.role === ROLES.REGIONAL_ADMIN && user.regionId) {
    scoped.regionId = user.regionId;
  }

  if (user.role === ROLES.DISTRICT_ADMIN) {
    if (user.regionId) scoped.regionId = user.regionId;
    if (user.districtId) scoped.districtId = user.districtId;
  }

  return scoped as T;
}

export function assertUserScopeAccess(
  user: JwtPayload | undefined,
  target: ScopeTarget,
  resourceName: string,
): void {
  if (!user) return;

  if (user.role === ROLES.REGIONAL_ADMIN && user.regionId) {
    if (target.regionId && target.regionId !== user.regionId) {
      throw new ForbiddenError(
        `You can only access ${resourceName} in your assigned region`,
      );
    }
  }

  if (user.role === ROLES.DISTRICT_ADMIN && user.districtId) {
    if (target.districtId && target.districtId !== user.districtId) {
      throw new ForbiddenError(
        `You can only access ${resourceName} in your assigned district`,
      );
    }
  }
}
