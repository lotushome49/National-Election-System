export type ScopedUser = {
  role?: string | null;
  regionId?: string | null;
  districtId?: string | null;
  assignedRegion?: string | null;
  assignedDistrict?: string | null;
};

export function getUserRegionId(user?: ScopedUser | null): string | null {
  return user?.regionId ?? user?.assignedRegion ?? null;
}

export function getUserDistrictId(user?: ScopedUser | null): string | null {
  return user?.districtId ?? user?.assignedDistrict ?? null;
}

export function getScopeAccessModel(user?: ScopedUser | null) {
  const role = user?.role ?? null;
  const regionId = getUserRegionId(user);
  const districtId = getUserDistrictId(user);

  return {
    role,
    regionId,
    districtId,
    canPickRegion: role === 'ADMIN',
    canPickDistrict: role === 'ADMIN' || role === 'REGIONAL_ADMIN',
    isRegionLocked: role === 'REGIONAL_ADMIN' || role === 'DISTRICT_ADMIN',
    isDistrictLocked: role === 'DISTRICT_ADMIN',
    summaryLabel:
      role === 'DISTRICT_ADMIN'
        ? `District scope: ${districtId ?? 'Unassigned'}`
        : role === 'REGIONAL_ADMIN'
          ? `Regional scope: ${regionId ?? 'Unassigned'}`
          : 'Global scope',
  };
}
