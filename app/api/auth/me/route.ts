import { ApiError, jsonOk, route } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

/** GET /api/auth/me — current authenticated user (sanitized) or 401. */
export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "unauthenticated", "Not signed in.");
  }
  return jsonOk({ user });
});
