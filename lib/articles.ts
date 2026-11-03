/**
 * 검진 안내(/checkup) 글 목록. 글을 추가할 때는 여기 한 곳만 고치면 된다.
 *
 * - slug가 있는 글: /checkup/{slug} 페이지가 있어야 한다(app/checkup/{slug}/page.tsx).
 *   목록 카드가 링크가 되고 사이트맵에도 들어간다.
 * - slug가 없는 글: "준비 중"으로 흐리게 보여 주기만 한다(페이지·링크 없음).
 */
export type Article = {
  title: string;
  summary: string;
  slug?: string;
  /** 글을 처음 올린 날 (YYYY-MM-DD) */
  publishedAt?: string;
  /** 본문을 마지막으로 고친 날. 고친 적이 없으면 publishedAt과 같다 */
  updatedAt?: string;
};

export type ArticleGroup = {
  name: string;
  articles: Article[];
};

export const ARTICLE_GROUPS: ArticleGroup[] = [
  {
    name: "국가건강검진",
    articles: [
      {
        title: "올해 내가 국가건강검진 대상일까?",
        summary: "대상 기준, 홀짝 출생연도 규칙, 3분 만에 확인하는 방법",
        slug: "national-checkup-eligibility",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
      {
        title: "일반검진에서 받는 검사 항목",
        summary: "문진부터 혈액·소변 검사까지 무엇을 하는지",
        slug: "general-checkup-items",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
      {
        title: "검진을 미뤘다면? 추가 수검 안내",
        summary: "기한을 넘겼을 때 받을 수 있는 방법",
        slug: "missed-checkup",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
    ],
  },
  {
    name: "암검진",
    articles: [
      {
        title: "6대 암검진 한눈에 보기",
        summary: "위·대장·간·유방·자궁경부·폐암, 나이와 주기",
        slug: "six-cancer-screenings",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
      {
        title: "위내시경과 위장조영촬영, 무엇을 고를까",
        summary: "두 검사의 차이와 선택 기준",
        slug: "endoscopy-vs-upper-gi",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
    ],
  },
  {
    name: "검진 전후",
    articles: [
      {
        title: "검진 전날과 당일 준비사항",
        summary: "금식 시간, 복용 중인 약, 대장내시경 장 정리",
        slug: "checkup-preparation",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
      {
        title: "국가검진과 종합검진은 무엇이 다를까",
        summary: "비용, 검사 범위, 함께 받는 방법",
        slug: "national-vs-comprehensive",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
      {
        title: "검진 결과 읽는 법과 재검 안내",
        summary: "결과 받는 시기, 판정 구분, 확진검사 안내",
        slug: "reading-checkup-results",
        publishedAt: "2026-10-02",
        updatedAt: "2026-10-02",
      },
    ],
  },
];

/** 검진 안내 글 경로 */
export function articlePath(slug: string): string {
  return `/checkup/${slug}`;
}

/** 발행된 글 전체(그룹을 펼친 순서 그대로) */
export function publishedArticles(): Article[] {
  return ARTICLE_GROUPS.flatMap((g) => g.articles).filter((a) => a.slug);
}

/**
 * 최근에 고친 글부터. 날짜가 같으면 목록 순서를 지킨다(정렬이 흔들리지 않게).
 * 홈 카드가 이 순서를 쓴다.
 */
export function articlesByRecency(): Article[] {
  const list = publishedArticles();
  return list
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const d = (v: Article) => v.updatedAt ?? v.publishedAt ?? "";
      const c = d(y.a).localeCompare(d(x.a));
      return c !== 0 ? c : x.i - y.i;
    })
    .map(({ a }) => a);
}

/** "2026-10-02" → "2026년 10월 2일" */
export function formatArticleDate(iso?: string): string | undefined {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : undefined;
}

/** slug로 글 하나를 찾는다. 없으면 undefined. */
export function articleBySlug(slug: string): Article | undefined {
  return publishedArticles().find((a) => a.slug === slug);
}

/**
 * 어느 병원 페이지에서나 도움이 되는 기본 글 3편. 시·도 목록 페이지가 쓴다.
 * 지역마다 다른 글을 고를 근거(지역별 데이터)가 없어 세 편을 고정으로 둔다.
 */
export const BASIC_ARTICLE_SLUGS = [
  "national-checkup-eligibility",
  "six-cancer-screenings",
  "checkup-preparation",
] as const;

export function basicArticles(): Article[] {
  return BASIC_ARTICLE_SLUGS.map(articleBySlug).filter(
    (a): a is Article => Boolean(a)
  );
}

/**
 * 병원 상세에 붙일 관련 글 2편을 **병원 데이터로** 고른다. 추측이 들어가지
 * 않도록 가진 필드만 본다.
 *
 * - 국가검진 지정기관이면 "내가 대상인지"부터가 궁금하다.
 * - 미지정·미확인이면 국가검진과 종합검진의 차이를 먼저 보는 게 맞다.
 * - 종합검진 가격이 올라와 있는 병원이면 국가검진과의 차이가 바로 이어진다.
 */
export function relatedArticles(hospital: {
  nationalScreeningDesignated?: boolean;
  priceRange?: string;
}): Article[] {
  const designated = hospital.nationalScreeningDesignated === true;
  const first = designated
    ? "national-checkup-eligibility"
    : "national-vs-comprehensive";
  const second =
    designated && hospital.priceRange
      ? "national-vs-comprehensive"
      : "checkup-preparation";
  return [first, second]
    .map(articleBySlug)
    .filter((a): a is Article => Boolean(a));
}

/** 페이지가 있는(발행된) 글의 slug 목록 — 사이트맵이 쓴다 */
export function publishedArticleSlugs(): string[] {
  return ARTICLE_GROUPS.flatMap((g) => g.articles)
    .map((a) => a.slug)
    .filter((s): s is string => Boolean(s));
}
