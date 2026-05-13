"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/permissions";
import { computeLegPools, payoutForBet } from "@/lib/odds";

import {
  BetKind,
  BetStatus,
  LegStatus,
  MeetingStatus,
  SelectionSide,
  WinningSide,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export interface PlaceBetInput {
  meetingId: string;
  stake: number;
  selections: { legId: string; side: "A" | "B" }[];
}

export async function placeBet(input: PlaceBetInput) {
  const session = await requireAuth();
  const userId = session.user.id;

  if (input.stake <= 0) throw new Error("Stake must be positive");
  if (input.selections.length === 0) throw new Error("No legs selected");

  const legIds = input.selections.map((s) => s.legId);
  if (new Set(legIds).size !== legIds.length) throw new Error("Duplicate legs");

  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: input.meetingId },
  });

  const locked =
    meeting.status === MeetingStatus.LOCKED ||
    meeting.status === MeetingStatus.RESOLVED ||
    meeting.startTime <= new Date();

  if (locked) throw new Error("Betting is closed for this meeting");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.points < input.stake) throw new Error("Insufficient points");

  const kind = input.selections.length === 1 ? BetKind.SINGLE : BetKind.PARLAY;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: input.stake } },
    }),
    prisma.bet.create({
      data: {
        userId,
        meetingId: input.meetingId,
        kind,
        stake: input.stake,
        selections: {
          create: input.selections.map((s) => ({
            legId: s.legId,
            side: s.side === "A" ? SelectionSide.A : SelectionSide.B,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/meetings/${input.meetingId}`);
}

export async function lockMeeting(meetingId: string) {
  await requireAdmin();
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: MeetingStatus.LOCKED },
  });
  await prisma.leg.updateMany({
    where: { meetingId },
    data: { status: LegStatus.LOCKED },
  });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/meetings/${meetingId}/manage`);
}

export interface ResolveLegInput {
  legId: string;
  winningSide: "A" | "B" | "PUSH" | "VOID";
  actualValue?: number;
}

export async function resolveLeg(input: ResolveLegInput) {
  await requireAdmin();

  const ws = {
    A: WinningSide.A,
    B: WinningSide.B,
    PUSH: WinningSide.PUSH,
    VOID: WinningSide.VOID,
  }[input.winningSide];

  await prisma.leg.update({
    where: { id: input.legId },
    data: {
      winningSide: ws,
      actualValue: input.actualValue ?? null,
      status: LegStatus.RESOLVED,
    },
  });

  const leg = await prisma.leg.findUniqueOrThrow({ where: { id: input.legId } });
  revalidatePath(`/meetings/${leg.meetingId}/manage`);
}

export async function resolveMeeting(meetingId: string) {
  await requireAdmin();

  // Load all pending bets with selections and their legs
  const bets = await prisma.bet.findMany({
    where: { meetingId, status: BetStatus.PENDING },
    include: { selections: true },
  });

  const legs = await prisma.leg.findMany({ where: { meetingId } });

  const allResolved = legs.every((l) => l.status === LegStatus.RESOLVED || l.status === LegStatus.VOID);
  if (!allResolved) throw new Error("All legs must be resolved before settling the meeting");

  const pools = computeLegPools(
    bets.map((b) => ({
      id: b.id,
      stake: b.stake,
      selections: b.selections.map((s) => ({ legId: s.legId, side: s.side })),
    }))
  );

  const resolvedLegs = legs.map((l) => ({ id: l.id, winningSide: l.winningSide }));

  await prisma.$transaction(async (tx) => {
    for (const bet of bets) {
      const { status, payout } = payoutForBet(
        {
          id: bet.id,
          stake: bet.stake,
          kind: bet.kind,
          selections: bet.selections.map((s) => ({ legId: s.legId, side: s.side })),
        },
        resolvedLegs,
        pools
      );

      await tx.bet.update({
        where: { id: bet.id },
        data: { status: status as BetStatus, payout },
      });

      if (payout > 0) {
        await tx.user.update({
          where: { id: bet.userId },
          data: { points: { increment: payout } },
        });
      }
    }

    await tx.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.RESOLVED },
    });
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/meetings/${meetingId}/manage`);
  revalidatePath("/leaderboard");
}

export async function createMeeting(data: {
  title: string;
  description?: string;
  startTime: Date;
}) {
  const session = await requireAdmin();
  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      createdById: session.user.id,
    },
  });
  revalidatePath("/");
  revalidatePath("/meetings");
  return meeting;
}

export async function createLeg(data: {
  meetingId: string;
  kind: "MONEYLINE" | "OVER_UNDER";
  prompt: string;
  line?: number;
  sideALabel: string;
  sideBLabel: string;
}) {
  await requireAdmin();
  const leg = await prisma.leg.create({
    data: {
      meetingId: data.meetingId,
      kind: data.kind as never,
      prompt: data.prompt,
      line: data.line ?? null,
      sideALabel: data.sideALabel,
      sideBLabel: data.sideBLabel,
    },
  });
  revalidatePath(`/meetings/${data.meetingId}/manage`);
  return leg;
}

export async function deleteLeg(legId: string) {
  await requireAdmin();
  const leg = await prisma.leg.findUniqueOrThrow({ where: { id: legId } });
  await prisma.leg.delete({ where: { id: legId } });
  revalidatePath(`/meetings/${leg.meetingId}/manage`);
}

export async function proposeLeg(data: {
  meetingId: string;
  kind: "MONEYLINE" | "OVER_UNDER";
  prompt: string;
  line?: number;
}) {
  const session = await requireAuth();
  await prisma.legProposal.create({
    data: {
      meetingId: data.meetingId,
      proposerId: session.user.id,
      kind: data.kind as never,
      prompt: data.prompt,
      line: data.line ?? null,
    },
  });
  revalidatePath("/propose");
}

export async function approveProposal(proposalId: string) {
  await requireAdmin();
  const proposal = await prisma.legProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  const sideALabel =
    proposal.kind === "OVER_UNDER" ? "Over" : "Yes";
  const sideBLabel =
    proposal.kind === "OVER_UNDER" ? "Under" : "No";

  await prisma.$transaction([
    prisma.leg.create({
      data: {
        meetingId: proposal.meetingId,
        kind: proposal.kind,
        prompt: proposal.prompt,
        line: proposal.line,
        sideALabel,
        sideBLabel,
      },
    }),
    prisma.legProposal.update({
      where: { id: proposalId },
      data: { status: "APPROVED" },
    }),
  ]);

  revalidatePath("/admin/proposals");
  revalidatePath(`/meetings/${proposal.meetingId}/manage`);
}

export async function rejectProposal(proposalId: string) {
  await requireAdmin();
  await prisma.legProposal.update({
    where: { id: proposalId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin/proposals");
}
