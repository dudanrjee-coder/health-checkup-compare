import { hospitals } from "@/lib/hospitals";

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
