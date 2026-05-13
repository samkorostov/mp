"use client";

import { useState, useTransition } from "react";
import { proposeLeg } from "@/lib/bets";

export default function ProposePage() {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<"MONEYLINE" | "OVER_UNDER">("MONEYLINE");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await proposeLeg({
          meetingId: meetingId,
          kind,
          prompt: fd.get("prompt") as string,
          line: kind === "OVER_UNDER" ? Number(fd.get("line")) : undefined,
        });
        setSuccess(true);
        setError(null);
        (e.target as HTMLFormElement).reset();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to submit proposal");
      }
    });
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Propose a Leg</h1>
      <p className="text-gray-400 text-sm mb-6">Suggest a betting leg for an upcoming meeting. The admin will review and approve it.</p>

      {success && (
        <div className="bg-green-900/40 border border-green-800 text-green-300 rounded-lg px-4 py-3 text-sm mb-6">
          Proposal submitted! The admin will review it shortly.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Meeting ID</label>
          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="Paste the meeting ID from the URL"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-600 mt-1">Find it in the URL: /meetings/&lt;id&gt;</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <div className="flex gap-2">
            {(["MONEYLINE", "OVER_UNDER"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${kind === k ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                {k === "MONEYLINE" ? "Moneyline" : "Over/Under"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Prompt</label>
          <input
            name="prompt"
            type="text"
            placeholder={kind === "OVER_UNDER" ? 'e.g. "Number of shushes"' : 'e.g. "Meeting ends early"'}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {kind === "OVER_UNDER" && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Line</label>
            <input
              name="line"
              type="number"
              step="0.5"
              placeholder="e.g. 2.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {isPending ? "Submitting…" : "Submit Proposal"}
        </button>
      </form>
    </div>
  );
}
