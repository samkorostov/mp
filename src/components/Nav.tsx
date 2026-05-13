"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

export default function Nav({ session }: { session: Session | null }) {
  const user = session?.user;
  const admin = user?.role === "ADMIN";

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="container mx-auto max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-white">
            Meeting Parlay
          </Link>
          <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition">
            Leaderboard
          </Link>
          {user && (
            <Link href="/propose" className="text-sm text-gray-400 hover:text-white transition">
              Propose Leg
            </Link>
          )}
          {admin && (
            <>
              <Link href="/meetings/new" className="text-sm text-yellow-400 hover:text-yellow-300 transition">
                New Meeting
              </Link>
              <Link href="/admin/proposals" className="text-sm text-yellow-400 hover:text-yellow-300 transition">
                Proposals
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-400">
                <span className="text-green-400 font-semibold">{user.points ?? "?"} pts</span>
                {admin && <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-medium">ADMIN</span>}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="text-sm bg-white text-black px-3 py-1.5 rounded hover:bg-gray-200 transition font-medium"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
