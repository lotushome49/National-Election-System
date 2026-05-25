import test from "node:test";
import assert from "node:assert/strict";
import { requirePermission } from "../src/middleware/rbac";
import { ROLES } from "../src/types";

function runPermissionCheck(role: string) {
  const nextCalls: unknown[] = [];
  const middleware = requirePermission("MANAGE_CANDIDATES");

  middleware(
    {
      user: {
        sub: "user-1",
        role,
        type: "access",
      },
    } as any,
    {} as any,
    (err?: unknown) => {
      nextCalls.push(err ?? null);
    },
  );

  return nextCalls[0] ?? null;
}

test("only ADMIN and SUPER_ADMIN can pass candidate status permission checks", () => {
  assert.equal(runPermissionCheck(ROLES.SUPER_ADMIN), null);
  assert.equal(runPermissionCheck(ROLES.ADMIN), null);

  assert.match(
    String(runPermissionCheck(ROLES.REGIONAL_ADMIN)),
    /lacks required permission/i,
  );
  assert.match(
    String(runPermissionCheck(ROLES.DISTRICT_ADMIN)),
    /lacks required permission/i,
  );
  assert.match(
    String(runPermissionCheck(ROLES.STAFF)),
    /lacks required permission/i,
  );
  assert.match(
    String(runPermissionCheck(ROLES.OBSERVER)),
    /lacks required permission/i,
  );
  assert.match(
    String(runPermissionCheck(ROLES.VOTER)),
    /lacks required permission/i,
  );
});
