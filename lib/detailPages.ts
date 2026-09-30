/**
 * 상세 페이지(`/hospital/[id]`)가 만들어져 있는 병원 id 목록.
 *
 * **이 배열이 유일한 기준이다.** `generateStaticParams`(어떤 경로를 미리 만들지)와
 * 카드의 "병원 상세 페이지 보기" 버튼(어떤 카드에 링크를 붙일지)이 같은 값을 봐야
 * 링크는 있는데 404가 나거나, 페이지는 있는데 들어갈 길이 없는 상태를 막을 수 있다.
 *
 * 지금은 시험용으로 가천대학교 길병원 한 곳뿐이다. 전체 병원으로 넓힐 때는
 * 여기에 id를 추가하거나, hospitals 전체를 반환하도록 바꾸면 된다.
 * (`app/sitemap.ts`에는 아직 넣지 않았다 — 시험 단계라 색인은 보류.)
 */
export const DETAIL_PAGE_IDS = ["incheon-gachon-gil"] as const;

const DETAIL_PAGE_ID_SET: ReadonlySet<string> = new Set(DETAIL_PAGE_IDS);

/** 이 병원에 상세 페이지가 있는지. 카드가 링크를 붙일지 정할 때 쓴다. */
export function hasDetailPage(id: string): boolean {
  return DETAIL_PAGE_ID_SET.has(id);
}

/** 상세 페이지 경로. 링크를 만드는 곳이 여러 군데라 문자열을 흩지 않는다. */
export function detailPath(id: string): string {
  return `/hospital/${id}`;
}
