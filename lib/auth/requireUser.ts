import "server-only";
import { ApiError } from "@/lib/api/http";
import { getCurrentSessionUser } from "@/lib/auth/session";
import type { UserDocument } from "@/models/User";

/**
 * Authorization guard for route handlers. Resolves the authenticated user
 * from the session cookie or throws a 401 ApiError.
 */
export async function requireUser(): Promise<UserDocument> {
  const result = await getCurrentSessionUser();
  if (!result) {
    throw new ApiError(401, "unauthenticated", "Please open BIRRLY to continue.");
  }
  return result.user;
}
