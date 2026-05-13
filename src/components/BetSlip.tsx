"use client";

import { useState, useTransition } from "react";
import type { Leg } from "@/generated/prisma/client";
import LegRow from "@/components/LegRow";
import type { LegPoolsMap } from "@/lib/odds";
import { multiplierForSide } from "@/lib/odds";
import { placeBet } from "@/lib/bets";
import { SelectionSide } from "@/generated/prisma/client";

type Selection = { legId: string; side: "A" | "B" };

export default function BetSlip({
  legs,
  meetingId,
  pools,
  userPoints,
  isLocked,
}: {
  legs: Leg[];
  meetingId: string;
  pools: LegPoolsMap;
  userPoints: number;
  isLocked: boolean;
}) {
  const [selections, setSelections] = useState<Map<string, "A" | "B">>(new Map());
  const [stake, setStake] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(legId: string, side: "A" | "B") {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.get(legId) === side) {
        next.delete(legId);
      } else {
        next.set(legId, side);
      }
      return next;
    });
    setError(null);
    setSuccess(null);
  }

  const selArr: Selection[] = Array.from(selections.entries()).map(([legId, side]) => ({ legId, side }));
  const isParlay = selArr.length > 1;

  function estimatedPayout() {
    if (selArr.length === 0) return null;
    let m = 1;
    for (const sel of selArr) {
      const legPools = pools.get(sel.legId);
      if (!legPools) return null;
      const mult = multiplierForSide(legPools, sel.side === "A" ? SelectionSide.A : SelectionSide.B);
      if (mult === null) return null;
      m *= mult;
    }
    return Math.round(stake * m);
  }

  const payout = estimatedPayout();

  function handlePlace() {
    if (selArr.length === 0) { setError("Select at least one leg"); return; }
    if (stake <= 0) { setError("Enter a stake greater than 0"); return; }
    if (stake > userPoints) { setError("Insufficient points"); return; }

    startTransition(async () => {
      try {
        await placeBet({ meetingId, stake, selections: selArr });
        setSelections(new Map());
        setStake(50);
        setSuccess(`Bet placed! ${isParlay ? "Parlay" : "Single"} — ${stake} pts wagered`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to place bet");
      }
    });
  }

  return (
    <div>
      <div className="space-y-3">
        {legs.map((leg) => (
          <LegRow
            key={leg.id}
            leg={leg}
            pools={pools.get(leg.id) ?? null}
            selectedSide={selections.get(leg.id) ?? null}
            onSelectA={() => toggle(leg.id, "A")}
            onSelectB={() => toggle(leg.id, "B")}
            disabled={isLocked}
          />
        ))}
      </div>

      {!isLocked && (
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Bet Slip
              {isParlay && (
                <span className="ml-2 text-xs bg-purple-700 text-purple-200 px-2 py-0.5 rounded-full">Parlay</span>
              )}
            </h3>
            <span className="text-sm text-gray-400">{selArr.length} leg{selArr.length !== 1 ? "s" : ""} selected</span>
          </div>

          {selArr.length > 0 && (
            <ul className="text-sm text-gray-300 mb-4 space-y-1">
              {selArr.map((sel) => {
                const leg = legs.find((l) => l.id === sel.legId)!;
                const label = sel.side === "A" ? leg.sideALabel : leg.sideBLabel;
                const legPools = pools.get(sel.legId);
                const m = legPools
                  ? multiplierForSide(legPools, sel.side === "A" ? SelectionSide.A : SelectionSide.B)
                  : null;
                return (
                  <li key={sel.legId} className="flex justify-between">
                    <span className="truncate mr-2">{leg.prompt} — <span className="text-white">{label}</span></span>
                    <span className="text-gray-400 shrink-0">{m ? `${m.toFixed(2)}×` : "—"}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-400 shrink-0">Stake (pts)</label>
            <input
              type="number"
              min={1}
              max={userPoints}
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {payout !== null && (
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-400">Est. payout</span>
              <span className="text-green-400 font-semibold">{payout} pts</span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-3">{success}</p>}

          <button
            onClick={handlePlace}
            disabled={isPending || selArr.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {isPending ? "Placing…" : isParlay ? "Place Parlay" : "Place Bet"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">Balance: {userPoints} pts</p>
        </div>
      )}

      {isLocked && (
        <div className="mt-4 text-center text-yellow-400 text-sm py-3 bg-yellow-900/20 rounded-lg border border-yellow-800">
          Betting is locked for this meeting
        </div>
      )}
    </div>
  );
}
