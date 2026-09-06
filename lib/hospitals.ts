import rawHospitals from "@/data/hospitals.json";
import { Hospital, Sido, SIDO_LIST, Tier, TIER_LIST } from "@/types/hospital";

export const hospitals: Hospital[] = rawHospitals as Hospital[];

export function getSidosWithData(): Set<Sido> {
  return new Set(hospitals.map((h) => h.region.sido));
}

export function getTiersWithData(sido: Sido | null): Set<Tier> {
  const scoped = sido
    ? hospitals.filter((h) => h.region.sido === sido)
    : hospitals;
  return new Set(scoped.map((h) => h.tier));
}

/**
 * 등급 필터 버튼 옆에 붙일 실제 개수. 하드코딩 없이 매번 hospitals.json에서
 * 계산한다. sido를 주면 그 지역으로 좁혀서 센다(tiersWithData와 같은 범위).
 */
export function getTierCounts(sido: Sido | null): Record<Tier, number> {
  const scoped = sido
    ? hospitals.filter((h) => h.region.sido === sido)
    : hospitals;
  const counts = Object.fromEntries(TIER_LIST.map((t) => [t, 0])) as Record<
    Tier,
    number
  >;
  for (const h of scoped) counts[h.tier] += 1;
  return counts;
}

/** 헤더 통계 배지용 집계. 하드코딩 없이 매번 hospitals.json에서 계산한다 */
export function getHeaderStats() {
  return {
    totalHospitals: hospitals.length,
    sidoCount: new Set(hospitals.map((h) => h.region.sido)).size,
    nationalDesignatedCount: hospitals.filter(
      (h) => h.nationalScreeningDesignated === true
    ).length,
  };
}

/** 한 글자만으로 지역이 단정되는 것을 막는다("구" → 대구광역시 같은 오작동 방지) */
const MIN_SIDO_MATCH_LENGTH = 2;

/**
 * 검색어가 시/도 이름 하나로만 좁혀지면 그 시/도를 돌려준다.
 * - "부산" → 부산광역시 (부산광역시만 "부산"을 포함)
 * - "충청남도" → 충청남도 (완전히 같아도 유일 매칭이므로 여기서 함께 잡힌다)
 * - "경상" → null (경상북도·경상남도 둘 다 해당하므로 단정할 수 없음)
 * - "부산광역시 서구" → null. 검색어가 시/도 이름보다 구체적이면 그대로 검색을 유지한다.
 *
 * **지역 판정에 쓰는 유일한 함수이고, 엔터(onSubmit)에서만 호출된다**(43번 항목).
 * 예전에는 타이핑 중 자동 전환용으로 정확 일치만 보는 findExactSidoMatch가
 * 따로 있었는데, 자동 전환 자체를 없애면서 이 함수 하나로 합쳤다.
 */
export function findUniqueSidoMatch(query: string): Sido | null {
  const q = query.trim();
  if (q.length < MIN_SIDO_MATCH_LENGTH) return null;

  const matched = SIDO_LIST.filter((sido) => sido.includes(q));
  return matched.length === 1 ? matched[0] : null;
}

/** 검색 대상: 병원명, "시/도 시군구" 지역 텍스트, 그리고 있으면 상세주소 */
function matchesQuery(hospital: Hospital, query: string): boolean {
  const name = hospital.name.toLowerCase();
  const region =
    `${hospital.region.sido} ${hospital.region.sigungu}`.toLowerCase();
  const address = hospital.address?.toLowerCase() ?? "";
  return (
    name.includes(query) ||
    region.includes(query) ||
    (address !== "" && address.includes(query))
  );
}

/** 목록 정렬 기준. "name"은 병원명 가나다순, "recommended"는 등급 우선순위 */
export type SortOption = "name" | "recommended";

/**
 * sido가 null이면 지역 제한 없이(= 전국) 등급 필터만 적용한다.
 * 검색어가 있으면 지역 선택은 무시하고 전국에서 찾는다. 등급 필터는 함께 적용된다.
 *
 * 등급 필터는 단일 선택이다(라디오 버튼처럼) — tier가 null이면 "전체"다.
 */
export function filterHospitals(
  sido: Sido | null,
  tier: Tier | null,
  query = "",
  sortBy: SortOption = "name"
): Hospital[] {
  const q = query.trim().toLowerCase();

  const filtered = hospitals.filter((h) => {
    if (tier && h.tier !== tier) return false;
    if (q) return matchesQuery(h, q);
    return !sido || h.region.sido === sido;
  });

  if (sortBy === "name") {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }

  /**
   * 등급 우선순위(TIER_LIST 순서: 상급종합병원 → 종합병원 → 병원 → 의료원)로
   * 정렬한다. Array.sort는 안정 정렬이라 같은 등급 안에서는 원래 순서가
   * 유지된다(카드 번호 배지도 이 순서를 그대로 따라간다).
   */
  return [...filtered].sort(
    (a, b) => TIER_LIST.indexOf(a.tier) - TIER_LIST.indexOf(b.tier)
  );
}
