import { hospitals } from "@/lib/hospitals";
import { Hospital, Sido, SIDO_LIST, Tier, TIER_LIST } from "@/types/hospital";

/**
 * 병원 찾기(/hospitals) 페이지들이 쓰는 지역 집계. **숫자는 전부 hospitals.json에서
 * 매번 계산한다** — 시·도 목록도 하드코딩하지 않고 데이터에 실제로 있는 값만 쓴다.
 */

export function countByTier(list: Hospital[]): Record<Tier, number> {
  const counts = Object.fromEntries(TIER_LIST.map((t) => [t, 0])) as Record<Tier, number>;
  for (const h of list) counts[h.tier] += 1;
  return counts;
}

export function countDesignated(list: Hospital[]): number {
  return list.filter((h) => h.nationalScreeningDesignated === true).length;
}

/** 병원이 1곳 이상 있는 시·도. 순서는 SIDO_LIST(드롭다운과 같은 순서)를 따른다. */
export function sidosWithHospitals(): Sido[] {
  const present = new Set(hospitals.map((h) => h.region.sido));
  return SIDO_LIST.filter((s) => present.has(s));
}

export function hospitalsInSido(sido: Sido): Hospital[] {
  return hospitals.filter((h) => h.region.sido === sido);
}

/** 등급 우선(상급종합 → 종합 → 병원 → 의료원), 같은 등급은 가나다순 */
function byTierThenName(a: Hospital, b: Hospital): number {
  const t = TIER_LIST.indexOf(a.tier) - TIER_LIST.indexOf(b.tier);
  return t !== 0 ? t : a.name.localeCompare(b.name, "ko");
}

export interface District {
  sigungu: string;
  hospitals: Hospital[];
}

/** 시·도 안의 시·군·구별 묶음. 병원 많은 순, 같으면 이름순.
 *  병원이 0곳인 시·군·구는 데이터에 나타나지 않으므로 자연히 빠진다. */
export function districtsOf(sido: Sido): District[] {
  const groups = new Map<string, Hospital[]>();
  for (const h of hospitalsInSido(sido)) {
    // 시·군·구가 비어 있는 병원(현재 0곳)도 목록에서 사라지지 않게 따로 묶는다.
    const key = h.region.sigungu?.trim() || "기타";
    const arr = groups.get(key) ?? [];
    arr.push(h);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .map(([sigungu, list]) => ({ sigungu, hospitals: list.sort(byTierThenName) }))
    .sort(
      (a, b) =>
        b.hospitals.length - a.hospitals.length ||
        a.sigungu.localeCompare(b.sigungu, "ko")
    );
}
