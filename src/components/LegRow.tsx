import type { Leg } from "@/generated/prisma/client";
import { LegStatus, WinningSide } from "@/generated/prisma/client";
import type { LegPools } from "@/lib/odds";
import { multiplierForSide } from "@/lib/odds";
import { SelectionSide } from "@/generated/prisma/client";

function fmt(m: number | null) {
  if (m === null) return "—";
  return `${m.toFixed(2)}×`;
}

const winBadge: Partial<Record<WinningSide, string>> = {
  A: "bg-green-800 text-green-200",
  B: "bg-red-900 text-red-300",
  PUSH: "bg-gray-700 text-gray-300",
  VOID: "bg-gray-700 text-gray-300",
};

export default function LegRow({
  leg,
  pools,
  onSelectA,
  onSelectB,
  selectedSide,
  disabled,
}: {
  leg: Leg;
  pools: LegPools | null;
  onSelectA?: () => void;
  onSelectB?: () => void;
  selectedSide?: "A" | "B" | null;
  disabled?: boolean;
}) {
  const mA = pools ? multiplierForSide(pools, SelectionSide.A) : null;
  const mB = pools ? multiplierForSide(pools, SelectionSide.B) : null;

  const resolved = leg.status === LegStatus.RESOLVED;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            {leg.kind === "OVER_UNDER" ? `O/U ${leg.line}` : "Moneyline"}
          </span>
          <p className="text-base font-medium text-white mt-0.5">{leg.prompt}</p>
        </div>
        {resolved && leg.winningSide && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${winBadge[leg.winningSide] ?? ""}`}>
            {leg.winningSide === "A" ? leg.sideALabel : leg.winningSide === "B" ? leg.sideBLabel : leg.winningSide}
            {leg.actualValue !== null && leg.actualValue !== undefined ? ` (${leg.actualValue})` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SideButton
          label={leg.sideALabel}
          multiplier={fmt(mA)}
          selected={selectedSide === "A"}
          winning={resolved && leg.winningSide === WinningSide.A}
          losing={resolved && leg.winningSide !== null && leg.winningSide !== WinningSide.A && leg.winningSide !== WinningSide.PUSH && leg.winningSide !== WinningSide.VOID}
          onClick={onSelectA}
          disabled={disabled || resolved}
        />
        <SideButton
          label={leg.sideBLabel}
          multiplier={fmt(mB)}
          selected={selectedSide === "B"}
          winning={resolved && leg.winningSide === WinningSide.B}
          losing={resolved && leg.winningSide !== null && leg.winningSide !== WinningSide.B && leg.winningSide !== WinningSide.PUSH && leg.winningSide !== WinningSide.VOID}
          onClick={onSelectB}
          disabled={disabled || resolved}
        />
      </div>
    </div>
  );
}

function SideButton({
  label,
  multiplier,
  selected,
  winning,
  losing,
  onClick,
  disabled,
}: {
  label: string;
  multiplier: string;
  selected: boolean;
  winning: boolean;
  losing: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base = "w-full rounded-lg p-3 text-left transition border";
  let style: string;

  if (winning) {
    style = "bg-green-900 border-green-600 text-white";
  } else if (losing) {
    style = "bg-gray-800 border-gray-700 text-gray-500 line-through";
  } else if (selected) {
    style = "bg-blue-800 border-blue-500 text-white";
  } else if (disabled) {
    style = "bg-gray-800 border-gray-700 text-gray-400 cursor-default";
  } else {
    style = "bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-500 cursor-pointer";
  }

  return (
    <button className={`${base} ${style}`} onClick={onClick} disabled={disabled}>
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs mt-1 opacity-70">{multiplier}</div>
    </button>
  );
}
