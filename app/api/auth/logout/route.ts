import { jsonOk, route } from "@/lib/api/http";
import { deleteCurrentSession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout — invalidates the server-side session and clears the
 * cookie. Idempotent: always succeeds.
 */
export const POST = route(async () => {
  await deleteCurrentSession();
  return jsonOk({ ok: true });
});
