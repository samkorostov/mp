import type { Bet, BetSelection, Leg, Meeting, User } from "@/generated/prisma/client";

export type MeetingWithLegs = Meeting & { legs: Leg[] };

export type LegWithSelections = Leg & {
  selections: (BetSelection & { bet: { stake: number } })[];
};

export type BetWithDetails = Bet & {
  selections: (BetSelection & { leg: Leg })[];
};

export type UserWithStats = User & {
  bets: Bet[];
};
