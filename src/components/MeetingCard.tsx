import Link from "next/link";
import type { Meeting } from "@/generated/prisma/client";
import { MeetingStatus } from "@/generated/prisma/client";

const statusColors: Record<MeetingStatus, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  OPEN: "bg-green-900 text-green-300",
  LOCKED: "bg-yellow-900 text-yellow-300",
  RESOLVED: "bg-blue-900 text-blue-300",
};

export default function MeetingCard({
  meeting,
  legCount,
}: {
  meeting: Meeting;
  legCount: number;
}) {
  const locked =
    meeting.status === MeetingStatus.LOCKED ||
    meeting.status === MeetingStatus.RESOLVED ||
    meeting.startTime <= new Date();

  return (
    <Link href={`/meetings/${meeting.id}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{meeting.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[meeting.status]}`}>
            {meeting.status}
          </span>
        </div>
        {meeting.description && (
          <p className="text-sm text-gray-400 mt-1">{meeting.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>{legCount} leg{legCount !== 1 ? "s" : ""}</span>
          <span>
            {locked ? "Bets locked" : `Bets open until ${new Date(meeting.startTime).toLocaleString()}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
