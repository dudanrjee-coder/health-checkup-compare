import { Sido, SIDO_LIST } from "@/types/hospital";

/**
 * 시·도 → URL slug 대응표. **`/hospitals/[sido]` 경로와 홈의 `/?sido=` 파라미터가
 * 이 표 하나만 본다.**
 *
 * **한 번 공개한 slug는 바꾸지 않는다.** 검색엔진 색인과 외부 링크가 이 주소에
 * 묶이기 때문이다. 시·도가 늘거나 통합되면 새 slug를 추가하고, 옛 slug는
 * 지우지 말고 리다이렉트로 남긴다.
 *
 * 표기 원칙: 국어의 로마자 표기법(문화체육관광부 고시)의 지명 표기를 소문자로,
 * "특별시/광역시/도" 같은 행정 접미어는 뺀다. 충청·전라·경상 남북도는 관용적으로
 * 널리 쓰는 약칭(chungbuk, jeonnam …)을 쓴다 — 저장소의 병원 id 접두어
 * (jeonnam-, gyeongnam- …)와도 같은 표기다.
 *
 * 전남광주통합특별시는 `jeonnam-gwangju`. 상세 페이지 제목에 쓰는 약칭
 * "전남광주"와 순서를 맞췄고, "gwangju"만 쓰면 옛 광주광역시 범위로 오해할 수
 * 있어 두 이름을 모두 남겼다.
 *
 * `Record<Sido, string>`이라 SIDO_LIST에 시·도가 늘면 컴파일 단계에서 걸린다.
 */
export const SIDO_SLUG: Record<Sido, string> = {
  서울특별시: "seoul",
  부산광역시: "busan",
  대구광역시: "daegu",
  인천광역시: "incheon",
  전남광주통합특별시: "jeonnam-gwangju",
  대전광역시: "daejeon",
  울산광역시: "ulsan",
  세종특별자치시: "sejong",
  경기도: "gyeonggi",
  강원특별자치도: "gangwon",
  충청북도: "chungbuk",
  충청남도: "chungnam",
  전북특별자치도: "jeonbuk",
  경상북도: "gyeongbuk",
  경상남도: "gyeongnam",
  제주특별자치도: "jeju",
};

const SLUG_TO_SIDO: ReadonlyMap<string, Sido> = new Map(
  SIDO_LIST.map((sido) => [SIDO_SLUG[sido], sido])
);

/** slug → 시·도. 모르는 slug면 null. */
export function sidoFromSlug(slug: string | null | undefined): Sido | null {
  if (!slug) return null;
  return SLUG_TO_SIDO.get(slug) ?? null;
}

/** 시·도별 병원 목록 페이지 경로 */
export function sidoPath(sido: Sido): string {
  return `/hospitals/${SIDO_SLUG[sido]}`;
}

/** 홈 화면에서 이 시·도를 미리 선택한 상태로 여는 경로 */
export function homeWithSidoPath(sido: Sido): string {
  return `/?sido=${SIDO_SLUG[sido]}`;
}
