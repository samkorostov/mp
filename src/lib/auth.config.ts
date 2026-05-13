import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/auth/signin" },
  callbacks: {
    authorized({ auth, request }) {
      const isSignedIn = !!auth?.user;
      const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
      if (isAuthPage) return true;
      return isSignedIn;
    },
  },
} satisfies NextAuthConfig;
