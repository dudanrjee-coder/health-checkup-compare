import { Tier, TIER_LIST } from "@/types/hospital";
import { TIER_COLORS } from "@/lib/tierColors";

/**
 * 병원 찾기 페이지들의 작은 서버 컴포넌트 조각(통계 알약·범례·비율 막대).
 * 색은 전부 lib/tierColors.ts의 등급 색을 쓴다(지도 마커·카드 배지와 같은 값).
 */

/** 등급 짧은 이름(시안 표기) */
export const TIER_SHORT: Record<Tier, string> = {
  상급종합병원: "상급종합",
  종합병원: "종합병원",
  병원: "병원",
  의료원: "의료원",
};

export function TierDot({ tier, size = 9 }: { tier: Tier; size?: number }) {
  return (
    <i
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: TIER_COLORS[tier].marker }}
    />
  );
}

const STAT =
  "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] tabular-nums";

export function StatPill({ children }: { children: React.ReactNode }) {
  return <span className={STAT}>{children}</span>;
}

export function TierStatPills({ counts }: { counts: Record<Tier, number> }) {
  return (
    <>
      {TIER_LIST.map((t) => (
        <StatPill key={t}>
          <TierDot tier={t} />
          {TIER_SHORT[t]} {counts[t]}
        </StatPill>
      ))}
    </>
  );
}

export function DesignatedPill({ count }: { count: number }) {
  return (
    <span className="flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-[13px] tabular-nums text-emerald-800">
      국가검진 지정 {count}
    </span>
  );
}

/** 지역 안 등급 비율 막대 */
export function TierBar({ counts, total }: { counts: Record<Tier, number>; total: number }) {
  return (
    <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-sm bg-slate-100">
      {TIER_LIST.map((t) =>
        counts[t] && total ? (
          <i
            key={t}
            className="block h-full"
            style={{ width: `${(counts[t] / total) * 100}%`, background: TIER_COLORS[t].marker }}
          />
        ) : null
      )}
    </div>
  );
}

export function TierLegend() {
  return (
    <div aria-hidden="true" className="flex flex-wrap gap-3.5 text-[12.5px] text-slate-500">
      {TIER_LIST.map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <TierDot tier={t} />
          {TIER_SHORT[t]}
        </span>
      ))}
      <span>막대 = 지역 안 등급 비율</span>
    </div>
  );
}
