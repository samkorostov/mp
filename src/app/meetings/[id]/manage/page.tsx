"use client";

import { useState, useTransition, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { lockMeeting, createLeg, resolveLeg, resolveMeeting, approveProposal } from "@/lib/bets";

type Leg = {
  id: string;
  kind: "MONEYLINE" | "OVER_UNDER";
  prompt: string;
  line: number | null;
  sideALabel: string;
  sideBLabel: string;
  status: string;
  winningSide: string | null;
  actualValue: number | null;
};

type Meeting = {
  id: string;
  title: string;
  status: string;
  startTime: string;
  legs: Leg[];
};

export default function ManageMeetingPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params.id;
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newLeg, setNewLeg] = useState({
    kind: "MONEYLINE" as "MONEYLINE" | "OVER_UNDER",
    prompt: "",
    line: "",
    sideALabel: "Yes",
    sideBLabel: "No",
  });

  async function refresh() {
    const res = await fetch(`/api/meetings/${meetingId}`);
    if (res.ok) setMeeting(await res.json());
  }

  useEffect(() => { refresh(); }, [meetingId]);

  function handleKindChange(kind: "MONEYLINE" | "OVER_UNDER") {
    setNewLeg((p) => ({
      ...p,
      kind,
      sideALabel: kind === "OVER_UNDER" ? "Over" : "Yes",
      sideBLabel: kind === "OVER_UNDER" ? "Under" : "No",
    }));
  }

  function handleAddLeg(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createLeg({
          meetingId,
          kind: newLeg.kind,
          prompt: newLeg.prompt,
          line: newLeg.line ? Number(newLeg.line) : undefined,
          sideALabel: newLeg.sideALabel,
          sideBLabel: newLeg.sideBLabel,
        });
        setNewLeg({ kind: "MONEYLINE", prompt: "", line: "", sideALabel: "Yes", sideBLabel: "No" });
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to add leg");
      }
    });
  }

  function handleLock() {
    startTransition(async () => {
      try {
        await lockMeeting(meetingId);
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to lock");
      }
    });
  }

  function handleResolveAll() {
    startTransition(async () => {
      try {
        await resolveMeeting(meetingId);
        router.push(`/meetings/${meetingId}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  if (!meeting) return <div className="text-gray-400">Loading…</div>;

  const allLocked = meeting.status === "LOCKED" || meeting.status === "RESOLVED";
  const allResolved = meeting.legs.every((l) => l.status === "RESOLVED" || l.status === "VOID");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <span className="text-sm text-gray-400">Status: {meeting.status}</span>
        </div>
        <div className="flex gap-2">
          {meeting.status === "OPEN" && (
            <button
              onClick={handleLock}
              disabled={isPending}
              className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              Lock Bets
            </button>
          )}
          {meeting.status === "LOCKED" && allResolved && (
            <button
              onClick={handleResolveAll}
              disabled={isPending}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              Settle Meeting
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 bg-red-950 border border-red-800 rounded px-3 py-2">{error}</p>}

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-300 mb-3">Legs</h2>
        {meeting.legs.length === 0 ? (
          <p className="text-gray-500 text-sm">No legs yet. Add one below.</p>
        ) : (
          <div className="space-y-3">
            {meeting.legs.map((leg) => (
              <LegResolveRow
                key={leg.id}
                leg={leg}
                disabled={isPending || meeting.status === "RESOLVED"}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {!allLocked && (
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Add Leg</h2>
          <form onSubmit={handleAddLeg} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex gap-2">
              {(["MONEYLINE", "OVER_UNDER"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKindChange(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${newLeg.kind === k ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  {k === "MONEYLINE" ? "Moneyline" : "Over/Under"}
                </button>
              ))}
            </div>
            <input
              value={newLeg.prompt}
              onChange={(e) => setNewLeg((p) => ({ ...p, prompt: e.target.value }))}
              placeholder='e.g. "Meeting ends early"'
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            />
            {newLeg.kind === "OVER_UNDER" && (
              <input
                type="number"
                step="0.5"
                value={newLeg.line}
                onChange={(e) => setNewLeg((p) => ({ ...p, line: e.target.value }))}
                placeholder="Line (e.g. 2.5)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newLeg.sideALabel}
                onChange={(e) => setNewLeg((p) => ({ ...p, sideALabel: e.target.value }))}
                placeholder="Side A label"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
              <input
                value={newLeg.sideBLabel}
                onChange={(e) => setNewLeg((p) => ({ ...p, sideBLabel: e.target.value }))}
                placeholder="Side B label"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {isPending ? "Adding…" : "Add Leg"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function LegResolveRow({
  leg,
  disabled,
  onRefresh,
}: {
  leg: Leg;
  disabled: boolean;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actualValue, setActualValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resolve(side: "A" | "B" | "PUSH" | "VOID") {
    startTransition(async () => {
      try {
        await resolveLeg({
          legId: leg.id,
          winningSide: side,
          actualValue: actualValue ? Number(actualValue) : undefined,
        });
        onRefresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to resolve");
      }
    });
  }

  const resolved = leg.status === "RESOLVED" || leg.status === "VOID";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-xs text-gray-500 uppercase">{leg.kind === "OVER_UNDER" ? `O/U ${leg.line}` : "Moneyline"}</span>
          <p className="text-sm text-white font-medium mt-0.5">{leg.prompt}</p>
        </div>
        {resolved && (
          <span className="text-xs text-green-400 bg-green-900/40 border border-green-800 px-2 py-0.5 rounded-full">
            {leg.winningSide}{leg.actualValue !== null ? ` (${leg.actualValue})` : ""}
          </span>
        )}
      </div>

      {!resolved && !disabled && (
        <div className="space-y-2">
          {leg.kind === "OVER_UNDER" && (
            <input
              type="number"
              step="0.5"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              placeholder="Actual value (optional — determines O/U automatically)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => resolve("A")} disabled={isPending} className="bg-green-800 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition">
              {leg.sideALabel} wins
            </button>
            <button onClick={() => resolve("B")} disabled={isPending} className="bg-red-900 hover:bg-red-800 text-white text-xs px-3 py-1.5 rounded-lg transition">
              {leg.sideBLabel} wins
            </button>
            <button onClick={() => resolve("PUSH")} disabled={isPending} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition">
              Push
            </button>
            <button onClick={() => resolve("VOID")} disabled={isPending} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition">
              Void
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}
