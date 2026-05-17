import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenError } from '../src/errors/AppError';
import { applyUserScope, assertUserScopeAccess } from '../src/utils/scope';

test('applyUserScope forces regional scope onto incoming queries', () => {
  const scoped = applyUserScope(
    { page: 1, limit: 20, regionId: 'foreign-region', districtId: undefined },
    {
      sub: 'user-1',
      role: 'REGIONAL_ADMIN',
      regionId: 'region-1',
      type: 'access',
    },
  );

  assert.equal(scoped.regionId, 'region-1');
});

test('applyUserScope forces both region and district for district admins', () => {
  const scoped = applyUserScope(
    { page: 1, limit: 20, regionId: 'foreign-region', districtId: 'foreign-district' },
    {
      sub: 'user-2',
      role: 'DISTRICT_ADMIN',
      regionId: 'region-7',
      districtId: 'district-4',
      type: 'access',
    },
  );

  assert.equal(scoped.regionId, 'region-7');
  assert.equal(scoped.districtId, 'district-4');
});

test('assertUserScopeAccess rejects cross-region access', () => {
  assert.throws(
    () =>
      assertUserScopeAccess(
        {
          sub: 'user-3',
          role: 'REGIONAL_ADMIN',
          regionId: 'region-1',
          type: 'access',
        },
        { regionId: 'region-2' },
        'voters',
      ),
    ForbiddenError,
  );
});

test('assertUserScopeAccess rejects cross-district access', () => {
  assert.throws(
    () =>
      assertUserScopeAccess(
        {
          sub: 'user-4',
          role: 'DISTRICT_ADMIN',
          regionId: 'region-1',
          districtId: 'district-1',
          type: 'access',
        },
        { regionId: 'region-1', districtId: 'district-2' },
        'results',
      ),
    ForbiddenError,
  );
});
