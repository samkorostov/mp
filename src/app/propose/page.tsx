import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@/generated/prisma/client";
import ProposeForm from "./ProposeForm";

export default async function ProposePage() {
  const meetings = await prisma.meeting.findMany({
    where: { status: { in: [MeetingStatus.OPEN, MeetingStatus.DRAFT] } },
    orderBy: { startTime: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Propose a Leg</h1>
      <p className="text-gray-400 text-sm mb-6">
        Suggest a betting leg for an upcoming meeting. The admin will review and approve it.
      </p>
      <ProposeForm meetings={meetings} />
    </div>
  );
}
