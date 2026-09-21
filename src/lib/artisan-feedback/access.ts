// Who may manage artisan-appreciation QR codes.
//
// The rest of this app doesn't restrict by role today (every signed-in user
// sees everything), so this matches that: any signed-in user with a valid
// role. The list exists so tightening it later is a one-line change, e.g.
// remove "STALL_MANAGER" to keep QR management to warehouse/admin staff.
export const QR_MANAGE_ROLES: readonly string[] = ["ADMIN", "INVENTORY_MANAGER", "STAFF", "STALL_MANAGER"];

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = "AccessError";
  }
}

type SessionLike = { user?: { id?: string | null; role?: string | null } | null } | null | undefined;

/** Pure check (no I/O) so it is easy to test. Returns the user or throws. */
export function assertCanManageQR(session: SessionLike): { id: string; role: string } {
  const user = session?.user;
  if (!user?.id) throw new AccessError(401, "Sign in to manage appreciation QR codes.");
  if (!user.role || !QR_MANAGE_ROLES.includes(user.role)) {
    throw new AccessError(403, "You don't have permission to manage appreciation QR codes.");
  }
  return { id: user.id, role: user.role };
}
