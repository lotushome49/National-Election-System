import type { Role } from '../types/election';

export const MFA_ELIGIBLE_ROLES: Role[] = ['ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN'];

export function isMfaEligibleRole(role: Role | string | null | undefined): boolean {
  return MFA_ELIGIBLE_ROLES.includes((role ?? 'NONE') as Role);
}

export function unwrapApiData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}
