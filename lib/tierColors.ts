import { Tier } from "@/types/hospital";

/**
 * tier → 색상 매핑. **지도 마커와 카드 배지가 여기 하나만 본다.**
 *
 * 두 군데가 각자 색을 하드코딩하면 한쪽만 고쳤을 때 지도와 카드가 어긋난다.
 * Tailwind 클래스가 아니라 hex를 쓰는 이유는, 마커가 Leaflet divIcon 안의
 * 인라인 SVG라 클래스를 못 쓰기 때문이다. 같은 값을 두 표현으로 나눠 두지
 * 않으려고 배지도 인라인 style로 같은 hex를 쓴다.
 */
export interface TierColor {
  /** 지도 마커(divIcon SVG) 채움색 */
  marker: string;
  /** 카드 tier 배지 배경색 */
  badgeBg: string;
  /** 카드 tier 배지 글자색 */
  badgeText: string;
}

/**
 * 등급별 색은 아래 네 가지로 확정한다(더 바뀌지 않는다) — 상급종합병원 보라,
 * 종합병원 초록, 병원 주황, 의료원 노랑. 이 표가 유일한 기준이니 지도·카드
 * 어디에도 다른 색을 새로 하드코딩하지 않는다.
 */
export const TIER_COLORS: Record<Tier, TierColor> = {
  상급종합병원: { marker: "#9333ea", badgeBg: "#f3e8ff", badgeText: "#6b21a8" },
  종합병원: { marker: "#16a34a", badgeBg: "#dcfce7", badgeText: "#166534" },
  병원: { marker: "#f97316", badgeBg: "#ffedd5", badgeText: "#9a3412" },
  의료원: { marker: "#eab308", badgeBg: "#fef9c3", badgeText: "#854d0e" },
};

/** 카드 tier 배지에 그대로 넣는 인라인 스타일. */
export function tierBadgeStyle(tier: Tier): { backgroundColor: string; color: string } {
  const c = TIER_COLORS[tier];
  return { backgroundColor: c.badgeBg, color: c.badgeText };
}
