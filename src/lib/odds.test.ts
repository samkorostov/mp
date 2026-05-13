import { describe, it, expect } from "vitest";
import { SelectionSide, WinningSide } from "@/generated/prisma/client";
import {
  computeLegPools,
  multiplierForSide,
  payoutForBet,
  type BetWithSelections,
} from "./odds";

const A = SelectionSide.A;
const B = SelectionSide.B;

function makeBet(id: string, stake: number, selections: { legId: string; side: SelectionSide }[]): BetWithSelections {
  return { id, stake, selections };
}

describe("computeLegPools", () => {
  it("splits stakes by side", () => {
    const bets = [
      makeBet("b1", 100, [{ legId: "l1", side: A }]),
      makeBet("b2", 200, [{ legId: "l1", side: B }]),
    ];
    const pools = computeLegPools(bets);
    const l1 = pools.get("l1")!;
    expect(l1.poolA).toBe(100);
    expect(l1.poolB).toBe(200);
    expect(l1.total).toBe(300);
  });

  it("a parlay contributes its stake to each touched leg", () => {
    const bets = [makeBet("b1", 50, [{ legId: "l1", side: A }, { legId: "l2", side: B }])];
    const pools = computeLegPools(bets);
    expect(pools.get("l1")!.poolA).toBe(50);
    expect(pools.get("l2")!.poolB).toBe(50);
  });

  it("returns empty map for no bets", () => {
    expect(computeLegPools([]).size).toBe(0);
  });
});

describe("multiplierForSide", () => {
  it("returns null when no bets on a side", () => {
    const m = multiplierForSide({ poolA: 0, poolB: 100, total: 100 }, A);
    expect(m).toBeNull();
  });

  it("returns total/pool when bets exist", () => {
    // 100 on A, 100 on B → multiplier = 200/100 = 2.0
    const m = multiplierForSide({ poolA: 100, poolB: 100, total: 200 }, A);
    expect(m).toBeCloseTo(2.0);
  });

  it("reflects skewed pool correctly", () => {
    // 300 on A, 100 on B → A multiplier = 400/300 ≈ 1.333
    const mA = multiplierForSide({ poolA: 300, poolB: 100, total: 400 }, A);
    expect(mA).toBeCloseTo(4 / 3);
    // B multiplier = 400/100 = 4.0
    const mB = multiplierForSide({ poolA: 300, poolB: 100, total: 400 }, B);
    expect(mB).toBeCloseTo(4.0);
  });
});

describe("payoutForBet — single", () => {
  it("pays out winner", () => {
    const bet = { ...makeBet("b1", 100, [{ legId: "l1", side: A }]), kind: "SINGLE" as const };
    const pools = new Map([["l1", { poolA: 100, poolB: 100, total: 200 }]]);
    const { status, payout } = payoutForBet(bet, [{ id: "l1", winningSide: WinningSide.A }], pools);
    expect(status).toBe("WON");
    expect(payout).toBe(200); // 100 × 2.0
  });

  it("returns 0 on loss", () => {
    const bet = { ...makeBet("b1", 100, [{ legId: "l1", side: A }]), kind: "SINGLE" as const };
    const pools = new Map([["l1", { poolA: 100, poolB: 100, total: 200 }]]);
    const { status, payout } = payoutForBet(bet, [{ id: "l1", winningSide: WinningSide.B }], pools);
    expect(status).toBe("LOST");
    expect(payout).toBe(0);
  });

  it("refunds stake on push", () => {
    const bet = { ...makeBet("b1", 75, [{ legId: "l1", side: A }]), kind: "SINGLE" as const };
    const pools = new Map([["l1", { poolA: 75, poolB: 75, total: 150 }]]);
    const { status, payout } = payoutForBet(bet, [{ id: "l1", winningSide: WinningSide.PUSH }], pools);
    expect(status).toBe("PUSH");
    expect(payout).toBe(75);
  });
});

describe("payoutForBet — parlay", () => {
  it("multiplies leg payouts when all hit", () => {
    const bet = {
      ...makeBet("b1", 50, [
        { legId: "l1", side: A },
        { legId: "l2", side: B },
      ]),
      kind: "PARLAY" as const,
    };
    const pools = new Map([
      ["l1", { poolA: 50, poolB: 50, total: 100 }],  // mA = 2.0
      ["l2", { poolA: 50, poolB: 50, total: 100 }],  // mB = 2.0
    ]);
    const { status, payout } = payoutForBet(
      bet,
      [{ id: "l1", winningSide: WinningSide.A }, { id: "l2", winningSide: WinningSide.B }],
      pools
    );
    expect(status).toBe("WON");
    expect(payout).toBe(200); // 50 × 2.0 × 2.0
  });

  it("loses if any leg misses", () => {
    const bet = {
      ...makeBet("b1", 50, [{ legId: "l1", side: A }, { legId: "l2", side: B }]),
      kind: "PARLAY" as const,
    };
    const pools = new Map([
      ["l1", { poolA: 50, poolB: 50, total: 100 }],
      ["l2", { poolA: 50, poolB: 50, total: 100 }],
    ]);
    const { status, payout } = payoutForBet(
      bet,
      [{ id: "l1", winningSide: WinningSide.A }, { id: "l2", winningSide: WinningSide.A }],
      pools
    );
    expect(status).toBe("LOST");
    expect(payout).toBe(0);
  });

  it("void leg is 1x passthrough — parlay survives with remaining multipliers", () => {
    const bet = {
      ...makeBet("b1", 50, [
        { legId: "l1", side: A },
        { legId: "l2", side: B },
      ]),
      kind: "PARLAY" as const,
    };
    const pools = new Map([
      ["l1", { poolA: 50, poolB: 50, total: 100 }],  // mA = 2.0
      ["l2", { poolA: 50, poolB: 50, total: 100 }],
    ]);
    const { status, payout } = payoutForBet(
      bet,
      [{ id: "l1", winningSide: WinningSide.A }, { id: "l2", winningSide: WinningSide.VOID }],
      pools
    );
    // l2 is void (1×), l1 hits at 2×. payout = 50 × 2 × 1 = 100
    expect(status).toBe("WON");
    expect(payout).toBe(100);
  });

  it("all-push parlay refunds stake", () => {
    const bet = {
      ...makeBet("b1", 60, [{ legId: "l1", side: A }, { legId: "l2", side: B }]),
      kind: "PARLAY" as const,
    };
    const pools = new Map([
      ["l1", { poolA: 60, poolB: 60, total: 120 }],
      ["l2", { poolA: 60, poolB: 60, total: 120 }],
    ]);
    const { status, payout } = payoutForBet(
      bet,
      [{ id: "l1", winningSide: WinningSide.PUSH }, { id: "l2", winningSide: WinningSide.PUSH }],
      pools
    );
    expect(status).toBe("PUSH");
    expect(payout).toBe(60);
  });
});
