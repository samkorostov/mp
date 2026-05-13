"use client";

import { useState, useTransition, useEffect } from "react";
import { approveProposal, rejectProposal } from "@/lib/bets";

type Proposal = {
  id: string;
  kind: string;
  prompt: string;
  line: number | null;
  status: string;
  createdAt: string;
  meeting: { title: string };
  proposer: { name: string | null; email: string | null };
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/proposals");
    if (res.ok) setProposals(await res.json());
  }

  useEffect(() => { refresh(); }, []);

  function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveProposal(id);
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      try {
        await rejectProposal(id);
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const pending = proposals.filter((p) => p.status === "PENDING");
  const resolved = proposals.filter((p) => p.status !== "PENDING");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Leg Proposals</h1>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {pending.length === 0 && (
        <p className="text-gray-500 text-sm mb-6">No pending proposals.</p>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm uppercase text-gray-500 font-semibold mb-3">Pending</h2>
          <div className="space-y-3">
            {pending.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onApprove={() => handleApprove(p.id)}
                onReject={() => handleReject(p.id)}
                disabled={isPending}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm uppercase text-gray-500 font-semibold mb-3">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((p) => (
              <ProposalCard key={p.id} proposal={p} disabled />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
  disabled,
}: {
  proposal: Proposal;
  onApprove?: () => void;
  onReject?: () => void;
  disabled?: boolean;
}) {
  const statusColor =
    proposal.status === "APPROVED" ? "text-green-400" :
    proposal.status === "REJECTED" ? "text-red-400" :
    "text-yellow-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs text-gray-500 uppercase">{proposal.kind === "OVER_UNDER" ? `O/U ${proposal.line}` : "Moneyline"}</span>
          <p className="text-white font-medium mt-0.5">{proposal.prompt}</p>
          <p className="text-xs text-gray-500 mt-1">
            For: {proposal.meeting.title} · by {proposal.proposer.name ?? proposal.proposer.email}
          </p>
        </div>
        <span className={`text-xs font-semibold ${statusColor}`}>{proposal.status}</span>
      </div>
      {proposal.status === "PENDING" && onApprove && onReject && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onApprove}
            disabled={disabled}
            className="bg-green-800 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="bg-red-900 hover:bg-red-800 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
