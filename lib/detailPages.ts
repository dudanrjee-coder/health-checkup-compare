import { hospitals } from "@/lib/hospitals";
import { splitAccessInfo } from "@/lib/noteChips";
import { Hospital, Sido } from "@/types/hospital";

/**
 * 상세 페이지(`/hospital/[id]`)가 만들어져 있는 병원 id 목록.
 *
 * **이 배열이 유일한 기준이다.** `generateStaticParams`(어떤 경로를 미리 만들지),
 * 카드의 상세 페이지 링크(어떤 카드에 링크를 붙일지), `app/sitemap.ts`(어떤 주소를
 * 색인에 올릴지)가 같은 값을 봐야 링크는 있는데 404가 나거나, 페이지는 있는데
 * 들어갈 길이 없는 상태를 막을 수 있다.
 *
 * 처음에는 시험용으로 가천대학교 길병원 한 곳만 있었고, 지금은 hospitals.json의
 * 전체 병원이다. id는 공개 URL이 되므로 한 번 공개한 뒤에는 바꾸지 않는다.
 */
export const DETAIL_PAGE_IDS: readonly string[] = hospitals.map((h) => h.id);

const DETAIL_PAGE_ID_SET: ReadonlySet<string> = new Set(DETAIL_PAGE_IDS);

/** 이 병원에 상세 페이지가 있는지. 카드가 링크를 붙일지 정할 때 쓴다. */
export function hasDetailPage(id: string): boolean {
  return DETAIL_PAGE_ID_SET.has(id);
}

/** 상세 페이지 경로. 링크를 만드는 곳이 여러 군데라 문자열을 흩지 않는다. */
export function detailPath(id: string): string {
  return `/hospital/${id}`;
}

/**
 * 상세 페이지를 검색엔진 색인 대상으로 둘지. **페이지 메타(robots)와 sitemap이
 * 이 함수 하나만 본다.**
 *
 * 기준: 상세 페이지 "검진 정보" 표 6항목(검진비용·결과통보·소요시간·식사제공·
 * 주차·교통) 중 하나라도 값이 있으면 색인한다. 전부 비어 "병원문의"만 나오는
 * 페이지는 내용이 빈약해 noindex(follow는 허용)로 두고 sitemap에서 뺀다.
 * 페이지 자체와 홈 카드 링크는 그대로다.
 *
 * 데이터에서 매번 계산하므로 조사로 값이 채워지면 자동으로 색인 대상이 된다.
 * 소요시간은 examDuration 필드를 본다(2026-10-01 추가).
 * 주차·교통은 표와 같은 splitAccessInfo로 나눈 결과를 본다.
 */
export function isIndexable(hospital: Hospital): boolean {
  const filled = (v?: string) => Boolean(v && v.trim());
  const { parking, transit } = splitAccessInfo(hospital.accessInfo);
  return [
    hospital.priceRange,
    hospital.resultNotice,
    hospital.examDuration,
    hospital.mealProvided,
    parking,
    transit,
  ].some(filled);
}

/**
 * 제목에 넣는 시·도 약칭. Record<Sido, …>라 시·도가 늘면 컴파일 단계에서 걸린다.
 * 전남광주통합특별시는 제목용으로 "전남광주"를 쓴다. README 9번의 공식 약칭은
 * "광주특별시"지만, 순천·광양 같은 옛 전남 지역 병원 제목에 "광주"만 붙으면
 * 오해를 부를 수 있어 제목에서만 이 표기를 쓴다(공식 약칭 규칙은 그대로).
 */
const SIDO_SHORT: Record<Sido, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  전남광주통합특별시: "전남광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

/** 시·도 약칭(예: 충청북도 → 충북). 병원 찾기 페이지의 지도 링크 문구도 쓴다. */
export function sidoShort(sido: Sido): string {
  return SIDO_SHORT[sido];
}

/** 제목용 지역 표기. 예: "인천 남동구". 시군구가 없으면 시·도 약칭만. */
export function regionLabel(hospital: Hospital): string {
  const short = SIDO_SHORT[hospital.region.sido];
  const sigungu = hospital.region.sigungu?.trim();
  return sigungu ? `${short} ${sigungu}` : short;
}

/**
 * 상세 페이지 title. 지역을 넣는 이유는 이름이 같은 병원(예: 서울여성병원이
 * 김포·부천에 각각 있다)의 제목이 서로 달라지게 하기 위해서다.
 */
export function detailTitle(hospital: Hospital): string {
  return `${hospital.name} 건강검진 정보 (${regionLabel(hospital)}) | 전국 건강검진 병원`;
}
