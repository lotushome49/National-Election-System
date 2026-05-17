import { describe, expect, it } from 'vitest';
import { isMfaEligibleRole, unwrapApiData } from './mfa';

describe('mfa utilities', () => {
  it('recognizes MFA-eligible roles', () => {
    expect(isMfaEligibleRole('ADMIN')).toBe(true);
    expect(isMfaEligibleRole('REGIONAL_ADMIN')).toBe(true);
    expect(isMfaEligibleRole('DISTRICT_ADMIN')).toBe(true);
    expect(isMfaEligibleRole('STAFF')).toBe(false);
  });

  it('unwraps API envelopes without breaking plain payloads', () => {
    expect(unwrapApiData({ enabled: true })).toEqual({ enabled: true });
    expect(unwrapApiData({ data: { enabled: true } })).toEqual({ enabled: true });
  });
});
