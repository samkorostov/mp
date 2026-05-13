import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeLegPools } from "@/lib/odds";
import BetSlip from "@/components/BetSlip";
import LegRow from "@/components/LegRow";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingStatus, Role } from "@/generated/prisma/client";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { legs: { orderBy: { createdAt: "asc" } } },
  });
  if (!meeting) notFound();

  const bets = await prisma.bet.findMany({
    where: { meetingId: id },
    include: { selections: true },
  });

  const pools = computeLegPools(
    bets.map((b) => ({
      id: b.id,
      stake: b.stake,
      selections: b.selections.map((s) => ({ legId: s.legId, side: s.side })),
    }))
  );

  const isLocked =
    meeting.status === MeetingStatus.LOCKED ||
    meeting.status === MeetingStatus.RESOLVED ||
    meeting.startTime <= new Date();

  const userBets = session
    ? bets.filter((b) => b.userId === session.user.id)
    : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          {meeting.description && (
            <p className="text-gray-400 mt-1">{meeting.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Start: {new Date(meeting.startTime).toLocaleString()}
            {isLocked && (
              <span className="ml-2 text-yellow-400">· Bets locked</span>
            )}
          </p>
        </div>
        {session?.user.role === Role.ADMIN && (
          <Link
            href={`/meetings/${id}/manage`}
            className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg transition"
          >
            Manage
          </Link>
        )}
      </div>

      {meeting.legs.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No legs added yet.</p>
      ) : session ? (
        <BetSlip
          legs={meeting.legs}
          meetingId={id}
          pools={pools}
          userPoints={session.user.points ?? 1000}
          isLocked={isLocked}
        />
      ) : (
        <div>
          <div className="space-y-3 mb-6">
            {meeting.legs.map((leg) => (
              <LegRow
                key={leg.id}
                leg={leg}
                pools={pools.get(leg.id) ?? null}
                disabled
              />
            ))}
          </div>
          <div className="text-center py-4">
            <Link
              href="/auth/signin"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              Sign in to place bets
            </Link>
          </div>
        </div>
      )}

      {userBets.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Your Bets</h2>
          <div className="space-y-2">
            {userBets.map((bet) => (
              <div key={bet.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm flex justify-between">
                <span className="text-gray-300">{bet.kind} · {bet.stake} pts staked</span>
                <span className={
                  bet.status === "WON" ? "text-green-400" :
                  bet.status === "LOST" ? "text-red-400" :
                  "text-gray-400"
                }>
                  {bet.status}{bet.payout != null ? ` · ${bet.payout} pts` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
