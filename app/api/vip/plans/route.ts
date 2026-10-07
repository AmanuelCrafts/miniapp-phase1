import { jsonOk, route } from "@/lib/api/http";
import { listActivePlans } from "@/services/vip.service";

/** GET /api/vip/plans — active plans sorted by level. Public. */
export const GET = route(async () => {
  const plans = await listActivePlans();
  return jsonOk({ plans });
});
