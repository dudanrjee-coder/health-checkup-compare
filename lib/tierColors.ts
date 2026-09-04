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

export const TIER_COLORS: Record<Tier, TierColor> = {
  // 헤더의 하늘색->인디고->핑크 그라디언트와 어울리도록 채도를 낮췄다.
  상급종합병원: { marker: "#6366f1", badgeBg: "#e0e7ff", badgeText: "#3730a3" },
  종합병원: { marker: "#10b981", badgeBg: "#d1fae5", badgeText: "#065f46" },
  병원: { marker: "#f59e0b", badgeBg: "#fef3c7", badgeText: "#92400e" },
  /**
   * 의원은 색이 아직 정해지지 않았다. **별도 지시가 있을 때까지 건드리지 않는다.**
   * 아래 값은 새로 고른 색이 아니라 기존 화면 색을 hex로 옮겨 적은 것이다
   * — 배지는 Tailwind `bg-slate-100 text-slate-800`, 마커는 선택되지 않은
   * 핀의 기본색 `#64748b`와 같은 값이라 화면상 변화가 없다.
   */
  의원: { marker: "#64748b", badgeBg: "#f1f5f9", badgeText: "#1e293b" },
};

/** 카드 tier 배지에 그대로 넣는 인라인 스타일. */
export function tierBadgeStyle(tier: Tier): { backgroundColor: string; color: string } {
  const c = TIER_COLORS[tier];
  return { backgroundColor: c.badgeBg, color: c.badgeText };
}
