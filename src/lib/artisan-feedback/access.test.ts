import { test } from "node:test";
import assert from "node:assert/strict";
import { AccessError, assertCanManageQR } from "./access";

test("access: no session → 401", () => {
  for (const s of [null, undefined, {}, { user: null }, { user: {} }, { user: { id: "" } }]) {
    assert.throws(() => assertCanManageQR(s), (e) => e instanceof AccessError && e.status === 401);
  }
});

test("access: signed in but missing/unknown role → 403", () => {
  for (const role of [undefined, null, "", "SUPERUSER", "admin"]) {
    assert.throws(() => assertCanManageQR({ user: { id: "u1", role } }), (e) => e instanceof AccessError && e.status === 403);
  }
});

test("access: known roles are allowed and the user id is returned", () => {
  for (const role of ["ADMIN", "INVENTORY_MANAGER", "STAFF", "STALL_MANAGER"]) {
    assert.deepEqual(assertCanManageQR({ user: { id: "u1", role } }), { id: "u1", role });
  }
});
