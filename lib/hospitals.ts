import rawHospitals from "@/data/hospitals.json";
import { Hospital, Sido, SIDO_LIST, Tier } from "@/types/hospital";

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

/** 한 글자만으로 지역이 단정되는 것을 막는다("구" → 대구광역시 같은 오작동 방지) */
const MIN_SIDO_MATCH_LENGTH = 2;

/**
 * 검색어가 시/도 이름 하나로만 좁혀지면 그 시/도를 돌려준다.
 * - "부산" → 부산광역시 (부산광역시만 "부산"을 포함)
 * - "경상" → null (경상북도·경상남도 둘 다 해당하므로 단정할 수 없음)
 * - "부산광역시 서구" → null. 검색어가 시/도 이름보다 구체적이면 그대로 검색을 유지한다.
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

/**
 * sido가 null이면 지역 제한 없이(= 전국) 등급 필터만 적용한다.
 * 검색어가 있으면 지역 선택은 무시하고 전국에서 찾는다. 등급 필터는 함께 적용된다.
 */
export function filterHospitals(
  sido: Sido | null,
  tiers: Set<Tier>,
  query = ""
): Hospital[] {
  const q = query.trim().toLowerCase();

  return hospitals.filter((h) => {
    if (tiers.size > 0 && !tiers.has(h.tier)) return false;
    if (q) return matchesQuery(h, q);
    return !sido || h.region.sido === sido;
  });
}
