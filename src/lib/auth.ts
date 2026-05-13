import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as unknown as { role: Role }).role;
        session.user.points = (user as unknown as { points: number }).points;
      }
      return session;
    },
    async signIn({ user }) {
      if (user.email && adminEmails.has(user.email)) {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: Role.ADMIN },
        });
      }
      return true;
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
      role: import("@/generated/prisma/client").Role;
      points: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
