import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.points = (user as unknown as { points: number }).points ?? 1000;
      } else if (token.id) {
        // Refresh points from DB on each token refresh
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { points: true },
        });
        if (dbUser) token.points = dbUser.points;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = adminEmails.has(session.user.email ?? "") ? "ADMIN" : "USER";
        session.user.points = token.points as number;
      }
      return session;
    },
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
