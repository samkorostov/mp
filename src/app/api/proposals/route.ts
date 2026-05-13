import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  await requireAdmin();
  const proposals = await prisma.legProposal.findMany({
    include: {
      meeting: { select: { title: true } },
      proposer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
}
