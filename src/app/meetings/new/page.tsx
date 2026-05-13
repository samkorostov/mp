"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeeting } from "@/lib/bets";

export default function NewMeetingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    const description = fd.get("description") as string;
    const startTime = new Date(fd.get("startTime") as string);

    if (!title || !startTime) { setError("Title and start time are required"); return; }

    startTransition(async () => {
      try {
        const meeting = await createMeeting({ title, description: description || undefined, startTime });
        router.push(`/meetings/${meeting.id}/manage`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create meeting");
      }
    });
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-6">New Meeting</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            name="title"
            type="text"
            placeholder="e.g. CM Weekly Meeting"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
          <input
            name="description"
            type="text"
            placeholder="Brief description"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Meeting Start Time</label>
          <input
            name="startTime"
            type="datetime-local"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {isPending ? "Creating…" : "Create Meeting"}
        </button>
      </form>
    </div>
  );
}
