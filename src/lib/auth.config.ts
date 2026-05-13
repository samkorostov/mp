import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

function parseEmailSet(env: string | undefined): Set<string> {
  return new Set(
    (env ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
}

const allowedEmails = parseEmailSet(process.env.ALLOWED_USERS);
const adminEmails = parseEmailSet(process.env.ADMIN_EMAILS);

function isAllowed(email: string | null | undefined): boolean {
  if (allowedEmails.size === 0) return true;
  const lower = (email ?? "").toLowerCase();
  return adminEmails.has(lower) || allowedEmails.has(lower);
}

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/auth/signin" },
  callbacks: {
    signIn({ user }) {
      return isAllowed(user.email);
    },
    authorized({ auth, request }) {
      const isSignedIn = !!auth?.user;
      const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
      if (isAuthPage) return true;
      if (!isSignedIn) return false;
      return isAllowed(auth.user?.email);
    },
  },
} satisfies NextAuthConfig;
