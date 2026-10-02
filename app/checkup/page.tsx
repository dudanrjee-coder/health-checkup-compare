import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { ARTICLE_GROUPS, articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진 안내 글 목록. 글 목록은 lib/articles.ts 한 곳에서 관리한다 —
 * slug가 있는 글만 링크 카드가 되고, 나머지는 "준비 중"으로 흐리게 보인다.
 */

const TITLE = "검진 안내 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가건강검진 대상부터 암검진, 검진 전 준비까지 병원을 고르기 전에 알아두면 좋은 건강검진 안내 글을 모았습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/checkup" },
  openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}/checkup`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const CARD = "flex h-full flex-col gap-1.5 rounded-[18px] border bg-white px-5 py-4";

export default function CheckupPage() {
  return (
    <InfoPage
      title="검진 안내"
      subtitle="국가건강검진 대상부터 검진 전 준비까지, 병원을 고르기 전에 알아두면 좋은 내용을 정리했습니다."
      wide
      bare
    >
      <div className="flex flex-col gap-9 pt-4">
        {ARTICLE_GROUPS.map((group) => (
          <section key={group.name} className="flex flex-col gap-3">
            <h2 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">{group.name}</h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 md:grid-cols-3">
              {group.articles.map((a) => (
                <li key={a.title}>
                  {a.slug ? (
                    <Link
                      href={articlePath(a.slug)}
                      className={`${CARD} group border-slate-200 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
                    >
                      <span className="text-[16px] font-bold leading-snug text-slate-900">{a.title}</span>
                      <span className="text-sm leading-relaxed text-slate-600">{a.summary}</span>
                      <span className="mt-auto pt-1.5 text-sm font-bold text-[#2563eb] group-hover:underline">
                        읽기 ›
                      </span>
                    </Link>
                  ) : (
                    <div className={`${CARD} border-dashed border-slate-200 bg-white/60`}>
                      <span className="text-[16px] font-bold leading-snug text-slate-400">{a.title}</span>
                      <span className="text-sm leading-relaxed text-slate-400">{a.summary}</span>
                      <span className="mt-auto pt-1.5 text-sm font-medium text-slate-400">준비 중</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
