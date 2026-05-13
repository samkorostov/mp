import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  callbacks: {
    authorized({ auth, request }) {
      const isSignedIn = !!auth?.user;
      const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
      if (isAuthPage) return true;
      return isSignedIn;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = adminEmails.has(session.user.email ?? "") ? "ADMIN" : "USER";
        session.user.points = (user as unknown as { points: number }).points;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
      points: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
