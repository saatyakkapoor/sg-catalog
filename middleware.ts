import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Gate every /admin route on a valid session cookie before the page renders.
 * Uses the provider-free config so it stays edge-compatible.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
