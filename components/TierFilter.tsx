"use client";

import { TIER_LIST, Tier } from "@/types/hospital";

interface TierFilterProps {
  selected: Set<Tier>;
  onToggle: (tier: Tier) => void;
  tiersWithData: Set<Tier>;
}

export default function TierFilter({
  selected,
  onToggle,
  tiersWithData,
}: TierFilterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">등급 필터</span>
      <div className="flex flex-wrap gap-2">
        {TIER_LIST.map((tier) => {
          const hasData = tiersWithData.has(tier);
          const isActive = selected.has(tier);
          return (
            <button
              key={tier}
              type="button"
              disabled={!hasData}
              onClick={() => onToggle(tier)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                !hasData
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {tier}
            </button>
          );
        })}
      </div>
    </div>
  );
}
