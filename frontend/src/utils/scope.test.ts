import { describe, expect, it } from 'vitest';
import { getScopeAccessModel } from './scope';

describe('getScopeAccessModel', () => {
  it('locks both region and district controls for district admins', () => {
    const scope = getScopeAccessModel({
      role: 'DISTRICT_ADMIN',
      regionId: 'region-1',
      districtId: 'district-9',
    });

    expect(scope.canPickRegion).toBe(false);
    expect(scope.canPickDistrict).toBe(false);
    expect(scope.isRegionLocked).toBe(true);
    expect(scope.isDistrictLocked).toBe(true);
    expect(scope.summaryLabel).toContain('district-9');
  });

  it('locks region but keeps district selection for regional admins', () => {
    const scope = getScopeAccessModel({
      role: 'REGIONAL_ADMIN',
      regionId: 'region-2',
    });

    expect(scope.canPickRegion).toBe(false);
    expect(scope.canPickDistrict).toBe(true);
    expect(scope.isRegionLocked).toBe(true);
    expect(scope.isDistrictLocked).toBe(false);
  });
});
