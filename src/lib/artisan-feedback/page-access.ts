import { notFound, redirect } from "next/navigation";
import { AccessError } from "./access";
import { requireQRManager } from "./session";

/** For admin pages: bounce anonymous users to login; hide the section from roles without access. */
export async function assertPageAccess() {
  try {
    return await requireQRManager();
  } catch (err) {
    if (err instanceof AccessError) {
      if (err.status === 401) redirect("/login");
      notFound();
    }
    throw err;
  }
}
