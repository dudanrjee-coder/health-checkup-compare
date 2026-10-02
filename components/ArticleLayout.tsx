import Link from "next/link";
import type { ReactNode } from "react";
import InfoPage, { INFO_ARTICLE, INFO_FINE, InfoSection } from "@/components/InfoPage";
import { ARTICLE_GROUPS, articlePath } from "@/lib/articles";

/**
 * 검진 안내 글 공통 틀. 모든 글이 같은 순서로 그려진다:
 * 제목 카드 → 초록 한 줄 요약 → 소제목별 본문 → 병원 찾기 안내 상자 → 출처·작성자·확인일·면책
 * → (데스크톱 오른쪽 / 모바일 본문 아래) 목차와 함께 읽기.
 *
 * "함께 읽기"는 lib/articles.ts에서 페이지가 있는 다른 글을 자동으로 모은다.
 */
export type ArticleSection = { id: string; heading: string; body: ReactNode };

export default function ArticleLayout({
  slug,
  title,
  subtitle,
  crumb,
  summary,
  sections,
  sources,
  checkedAt,
}: {
  slug: string;
  title: string;
  subtitle: string;
  /** 위치 표시 마지막 단계(짧은 이름) */
  crumb: string;
  summary: ReactNode;
  sections: ArticleSection[];
  sources: string;
  /** 공식 자료를 실제로 확인한 날짜, 예: "2026년 10월 2일" */
  checkedAt: string;
}) {
  const related = ARTICLE_GROUPS.flatMap((g) => g.articles).filter((a) => a.slug && a.slug !== slug);
  return (
    <InfoPage
      title={title}
      subtitle={subtitle}
      trail={[{ label: "검진 안내", href: "/checkup" }, { label: crumb }]}
      wide
      bare
    >
      <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1fr)_240px] md:items-start">
        <article className={INFO_ARTICLE}>
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="m-0 text-sm font-bold text-emerald-800">한 줄 요약</p>
            <p className="m-0 text-emerald-950">{summary}</p>
          </div>

          {sections.map((s) => (
            <InfoSection key={s.id} id={s.id} heading={s.heading}>
              {s.body}
            </InfoSection>
          ))}

          <div className="flex flex-col gap-2 rounded-[18px] border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="m-0 font-bold text-slate-900">대상이라면, 가까운 검진 병원을 찾아보세요</p>
            <Link
              href="/hospitals"
              className="self-start font-bold text-[#2563eb] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              지역별 국가검진 지정 병원 보기 ›
            </Link>
          </div>

          <div className={`${INFO_FINE} flex flex-col gap-1`}>
            <p className="m-0">출처: {sources}</p>
            <p className="m-0">작성 건강검진병원.com 운영자 · 확인일 {checkedAt}</p>
            <p className="m-0">검진 제도는 바뀔 수 있으니 정확한 내용은 공단에 확인해 주세요.</p>
          </div>
        </article>

        {/* 데스크톱은 오른쪽 사이드(따라 내려옴), 모바일은 본문 아래 */}
        <aside className="flex flex-col gap-5 md:sticky md:top-6 md:pt-4">
          <nav aria-label="이 글의 순서" className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="m-0 text-sm font-bold text-slate-900">이 글의 순서</p>
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-slate-600 hover:text-slate-900 hover:underline">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <nav aria-label="함께 읽기" className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="m-0 text-sm font-bold text-slate-900">함께 읽기</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link href={articlePath(a.slug!)} className="text-slate-700 hover:text-slate-900 hover:underline">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/checkup" className="pt-1 text-sm font-bold text-[#2563eb] hover:underline">
              검진 안내 전체 보기 ›
            </Link>
          </nav>
        </aside>
      </div>
    </InfoPage>
  );
}

/**
 * 글 속 표. 모바일은 글씨·여백을 줄이고 긴 칸은 단어 단위로 줄바꿈해 화면 폭에 맞춘다.
 * 아주 좁은 화면에서 그래도 넘치면 표만 가로 스크롤(페이지는 밀리지 않음).
 * nowrapCols: 줄바꿈하지 않을 열 번호(짧은 값만 있는 열)
 */
export function ArticleTable({
  head,
  rows,
  nowrapCols = [],
  dense = false,
}: {
  head: string[];
  rows: string[][];
  nowrapCols?: number[];
  /** 열이 많은 표: 모바일 글씨·여백을 한 단계 더 줄인다 */
  dense?: boolean;
}) {
  const cell = dense ? "px-2 py-2 sm:px-3 sm:py-2.5" : "px-3 py-2 sm:px-4 sm:py-2.5";
  const nw = (i: number) => (nowrapCols.includes(i) ? "whitespace-nowrap " : "");
  return (
    <div className="overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
      <table
        className={`w-full break-keep border-collapse text-left ${dense ? "text-[13px] sm:text-[15px]" : "text-[14px] sm:text-[15px]"}`}
      >
        <thead className={`bg-slate-100 text-slate-600 ${dense ? "text-[12px] sm:text-sm" : "text-sm"}`}>
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={`${nw(i)}${cell} font-bold`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-slate-100">
              {row.map((v, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className={`${nw(i)}${cell} font-bold text-slate-900`}>
                    {v}
                  </th>
                ) : (
                  <td key={i} className={`${nw(i)}${cell} text-slate-700`}>
                    {v}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 번호 단계 목록 */
export function ArticleSteps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white"
          >
            {i + 1}
          </span>
          <span className="text-slate-700">
            <span className="sr-only">{`${i + 1}단계: `}</span>
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** 본문 속 다른 글 링크 */
export function ArticleLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <Link href={articlePath(slug)} className="font-bold text-[#2563eb] underline underline-offset-2 hover:text-blue-700">
      {children}
    </Link>
  );
}
