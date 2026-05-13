export type SelectionSide = "A" | "B";
export type WinningSide = "A" | "B" | "PUSH" | "VOID";

export interface BetWithSelections {
  id: string;
  stake: number;
  selections: { legId: string; side: SelectionSide }[];
}

export interface LegPools {
  poolA: number;
  poolB: number;
  total: number;
}

export type LegPoolsMap = Map<string, LegPools>;

/** Sum stakes into per-leg A/B pools. Every bet (single or parlay) contributes
 *  its full stake to each leg it touches — the chosen trade-off for parimutuel. */
export function computeLegPools(bets: BetWithSelections[]): LegPoolsMap {
  const map = new Map<string, LegPools>();

  for (const bet of bets) {
    for (const sel of bet.selections) {
      const existing = map.get(sel.legId) ?? { poolA: 0, poolB: 0, total: 0 };
      if (sel.side === "A") {
        existing.poolA += bet.stake;
      } else {
        existing.poolB += bet.stake;
      }
      existing.total = existing.poolA + existing.poolB;
      map.set(sel.legId, existing);
    }
  }

  return map;
}

/** Decimal multiplier for a given side. Returns null when no bets on that side. */
export function multiplierForSide(
  pools: LegPools,
  side: SelectionSide
): number | null {
  const sidePool = side === "A" ? pools.poolA : pools.poolB;
  if (sidePool === 0 || pools.total === 0) return null;
  return pools.total / sidePool;
}

export interface ResolvedLeg {
  id: string;
  winningSide: WinningSide | null;
}

/**
 * Compute payout for a settled bet.
 *
 * For SINGLE: stake × multiplier if hit, stake back on PUSH/VOID, 0 on miss.
 * For PARLAY: stake × product of multipliers for all hit legs.
 *   A PUSH/VOID leg on a parlay is treated as a 1× passthrough (doesn't kill the parlay).
 *   If any leg is a loss, the whole parlay is lost.
 */
export function payoutForBet(
  bet: BetWithSelections & { kind: "SINGLE" | "PARLAY" },
  resolvedLegs: ResolvedLeg[],
  pools: LegPoolsMap
): { status: "WON" | "LOST" | "PUSH" | "VOID"; payout: number } {
  const legMap = new Map(resolvedLegs.map((l) => [l.id, l]));

  let multiplier = 1;
  let anyLoss = false;
  let allPush = true;

  for (const sel of bet.selections) {
    const leg = legMap.get(sel.legId);
    if (!leg) continue;

    const ws = leg.winningSide;

    if (ws === "VOID" || ws === "PUSH") {
      continue;
    }

    allPush = false;

    if (sel.side !== ws) {
      anyLoss = true;
      break;
    }

    const legPools = pools.get(sel.legId);
    if (!legPools) continue;

    const m = multiplierForSide(legPools, sel.side);
    if (m !== null) multiplier *= m;
  }

  if (anyLoss) return { status: "LOST", payout: 0 };
  if (allPush) return { status: "PUSH", payout: bet.stake };

  const payout = Math.round(bet.stake * multiplier);
  return { status: "WON", payout };
}
