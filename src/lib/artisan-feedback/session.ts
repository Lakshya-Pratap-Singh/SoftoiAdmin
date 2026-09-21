import { auth } from "@/lib/auth";
import { assertCanManageQR } from "./access";

/**
 * Server-side gate for every QR management action and API route.
 * Deliberately re-checks the session here instead of trusting src/proxy.ts:
 * the proxy is an optimistic redirect, not an authorisation boundary, and
 * server actions can be invoked directly.
 */
export async function requireQRManager() {
  return assertCanManageQR(await auth());
}
