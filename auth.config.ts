import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config.
 *
 * It contains no providers and no bcrypt import, so it can run inside
 * middleware. The credentials provider lives in `auth.ts`, which only runs in
 * the Node.js runtime.
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "admin";
        token.name = user.name ?? token.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as { role?: string }).role =
          (token.role as string | undefined) ?? "admin";
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAdminArea =
        pathname === "/admin" || pathname.startsWith("/admin/");
      const isLoginPage = pathname.startsWith("/admin/login");
      if (!isAdminArea || isLoginPage) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
