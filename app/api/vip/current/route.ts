import { jsonOk, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/requireUser";
import { getCurrentVipForUser } from "@/services/vip.service";
import { toPublicUser } from "@/services/auth.service";

/**
 * GET /api/vip/current — the authenticated user's VIP state.
 * Users without a VIP get { hasVip: false, vip: null }.
 * There is intentionally NO endpoint that accepts a vipLevel from the client.
 */
export const GET = route(async () => {
  const user = await requireUser();
  const currentVip = await getCurrentVipForUser(toPublicUser(user));
  return jsonOk(currentVip);
});
