"use client";

import { CSSProperties } from "react";
import { TIER_LIST, Tier } from "@/types/hospital";
import { TIER_COLORS } from "@/lib/tierColors";

interface TierFilterProps {
  /** 단일 선택이다(라디오 버튼처럼) — null이면 "전체". */
  selected: Tier | null;
  onSelect: (tier: Tier) => void;
  tiersWithData: Set<Tier>;
  /** 버튼 옆에 표시할 실제 개수(hospitals.json 기준, lib/hospitals.ts의 getTierCounts) */
  tierCounts: Record<Tier, number>;
  /** "전체" 버튼에 표시할 합계(tierCounts 총합) */
  allCount: number;
  /** "전체" 버튼을 누르면 등급 필터를 모두 해제한다 */
  onClearAll: () => void;
}

/**
 * 등급 필터. 색은 지도 마커·카드 배지와 같은 `TIER_COLORS`에서 가져온다.
 *
 * **버튼 전체가 등급 색을 띤다.** 고르지 않은 상태에서도 테두리·글자가 등급
 * 색이라, 필터가 지도 범례를 겸한다. 처음에는 작은 색 점만 붙였는데 색이
 * 점에만 갇혀 눈에 띄지 않았다(50번 항목).
 *
 * 고른 상태는 **채움**, 안 고른 상태는 **외곽선**으로 가른다. 배경에 마커 색을
 * 깔지 않는 이유는 `병원`의 노랑(`#eab308`) 위 흰 글자가 대비 1.9:1로 읽히지
 * 않기 때문이다. 대신 테두리에 마커 색을 써서 지도 색과 이어지게 한다.
 */
export default function TierFilter({
  selected,
  onSelect,
  tiersWithData,
  tierCounts,
  allCount,
  onClearAll,
}: TierFilterProps) {
  const isAllActive = selected === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 시안에는 "등급 필터" 같은 굵은 섹션 라벨이 없고, 버튼 줄 왼쪽에
          작은 회색 라벨만 있다. */}
      <span className="mr-1 shrink-0 text-xs font-medium text-slate-400">
        등급
      </span>

      <button
        type="button"
        onClick={onClearAll}
        className={[
          "rounded-full border px-3 py-1.5 text-sm transition-colors",
          isAllActive
            ? "border-blue-600 bg-blue-600 font-medium text-white"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        ].join(" ")}
      >
        전체 {allCount}
      </button>

      {TIER_LIST.map((tier) => {
        const hasData = tiersWithData.has(tier);
        const isActive = selected === tier;
        const color = TIER_COLORS[tier];

        // 데이터가 없는 등급은 지도에 마커도 없으므로 등급 색을 쓰지 않고
        // 통째로 회색으로 둔다. 고를 수 없다는 것이 먼저 읽혀야 한다.
        let style: CSSProperties | undefined;
        if (hasData && isActive) {
          style = {
            backgroundColor: color.badgeBg,
            color: color.badgeText,
            borderColor: color.marker,
            // 테두리를 2px로 키우면 글자가 1px 밀린다. 안쪽 그림자로 굵어
            // 보이게만 해서 고른 상태를 또렷하게 하고 레이아웃은 건드리지 않는다.
            boxShadow: `inset 0 0 0 1px ${color.marker}`,
          };
        } else if (hasData) {
          style = {
            color: color.badgeText,
            borderColor: color.marker,
            // 호버 배경을 등급 색으로 주려면 인라인 style로는 안 되므로
            // CSS 변수로 넘기고 클래스에서 받는다.
            ["--tier-tint" as string]: color.badgeBg,
          };
        }

        return (
          <button
            key={tier}
            type="button"
            disabled={!hasData}
            onClick={() => onSelect(tier)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              !hasData
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : isActive
                ? "font-medium"
                : "bg-white hover:bg-[var(--tier-tint)]",
            ].join(" ")}
            style={style}
          >
            {tier} {tierCounts[tier]}
          </button>
        );
      })}
    </div>
  );
}
