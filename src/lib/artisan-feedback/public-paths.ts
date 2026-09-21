// Exactly which URLs are public (no login): /feedback/<one segment> and
// /feedback/<one segment>/opened. Not a prefix match, so nothing deeper that
// is added under /feedback later becomes public by accident.
//
// The segment is deliberately NOT restricted to the token alphabet: a customer
// with a slightly mangled link (stray character, bad copy-paste) should get
// the friendly "link not found" page, not be bounced to the admin login. The
// page validates the token itself and answers 404 for anything invalid.
const PUBLIC_FEEDBACK_PATH = /^\/feedback\/[^/]{1,512}(\/opened)?\/?$/;

export function isPublicFeedbackPath(pathname: string): boolean {
  return PUBLIC_FEEDBACK_PATH.test(pathname);
}

/** Admin JSON/binary endpoints answer 401 instead of redirecting to the login page. */
export function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}
