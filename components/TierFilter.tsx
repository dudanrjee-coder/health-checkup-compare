"use client";

import { TIER_LIST, Tier } from "@/types/hospital";
import { TIER_COLORS } from "@/lib/tierColors";

interface TierFilterProps {
  selected: Set<Tier>;
  onToggle: (tier: Tier) => void;
  tiersWithData: Set<Tier>;
}

/**
 * 등급 필터. 색은 지도 마커·카드 배지와 같은 `TIER_COLORS`에서 가져온다.
 *
 * 버튼마다 **마커와 같은 색의 점**을 붙여, 고르지 않은 상태에서도 "이 등급이
 * 지도에서 무슨 색인가"를 읽을 수 있게 했다. 필터가 지도 범례 역할을 겸한다.
 *
 * 선택된 버튼은 마커 색을 그대로 칠하지 않고 **배지 색(연한 배경 + 진한 글자)**을
 * 쓴다. 마커 색을 배경으로 깔면 `병원`(노랑 `#eab308`) 위의 흰 글자가 대비
 * 1.9:1로 읽히지 않는다. 배지 색 조합은 4종 모두 AA(4.5:1)를 넘는다(49번 항목).
 */
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
          const color = TIER_COLORS[tier];

          return (
            <button
              key={tier}
              type="button"
              disabled={!hasData}
              onClick={() => onToggle(tier)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                !hasData
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : isActive
                  ? "font-medium"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
              style={
                hasData && isActive
                  ? {
                      backgroundColor: color.badgeBg,
                      color: color.badgeText,
                      borderColor: color.marker,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: color.marker,
                  // 데이터가 없어 못 고르는 등급은 점도 흐리게 둬서 버튼 상태와 어긋나지 않게 한다.
                  opacity: hasData ? 1 : 0.4,
                }}
              />
              {tier}
            </button>
          );
        })}
      </div>
    </div>
  );
}
