import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import MeetingCard from "@/components/MeetingCard";
import Link from "next/link";
import { MeetingStatus } from "@/generated/prisma/client";

export default async function Home() {
  const session = await auth();

  const meetings = await prisma.meeting.findMany({
    where: { status: { not: MeetingStatus.DRAFT } },
    include: { _count: { select: { legs: true } } },
    orderBy: { startTime: "asc" },
  });

  const active = meetings.filter(
    (m) => m.status === MeetingStatus.OPEN || m.status === MeetingStatus.LOCKED
  );
  const resolved = meetings.filter((m) => m.status === MeetingStatus.RESOLVED);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Meeting Parlay</h1>
          <p className="text-gray-400 mt-1">Bet on TA meeting outcomes with fake points</p>
        </div>
        {!session && (
          <Link
            href="/auth/signin"
            className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Sign in to bet
          </Link>
        )}
      </div>

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Active Meetings</h2>
          <div className="space-y-3">
            {active.map((m) => (
              <MeetingCard key={m.id} meeting={m} legCount={m._count.legs} />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Resolved</h2>
          <div className="space-y-3">
            {resolved.map((m) => (
              <MeetingCard key={m.id} meeting={m} legCount={m._count.legs} />
            ))}
          </div>
        </section>
      )}

      {meetings.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No meetings yet.</p>
          {session?.user.role === "ADMIN" && (
            <Link href="/meetings/new" className="text-blue-400 hover:underline mt-2 inline-block">
              Create the first meeting
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
