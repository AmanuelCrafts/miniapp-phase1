"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicUser } from "@/types/auth";

/**
 * Holds the SERVER-VERIFIED user (from the HTTP-only session), hydrated from
 * the server render. This is display/UX state only — all authorization
 * happens server-side on every request.
 */

const AuthContext = createContext<PublicUser | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={initialUser}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): PublicUser | null {
  return useContext(AuthContext);
}
