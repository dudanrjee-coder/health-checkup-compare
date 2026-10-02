import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { INFO_ARTICLE, INFO_FINE, INFO_P, InfoSection } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진 안내 첫 글. 모든 사실은 국민건강보험공단 공식 자료로 확인했다(2026-10-02):
 *  - 건강모아 > 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do)·암검진(wbhaca04600m01.do)
 *  - 같은 페이지의 「2026년 일반(암)건강검진 안내문」 PDF
 * 제도가 바뀌면(특히 연도·대상 연령·본인부담) 위 자료와 다시 대조한다.
 */

const SLUG = "national-checkup-eligibility";
const TITLE = "올해 내가 국가건강검진 대상일까? | 전국 건강검진 병원";
const DESCRIPTION =
  "2026년 국가건강검진 대상 기준(짝수 연도 출생자), 6대 암검진 대상 나이와 주기, 국민건강보험공단에서 대상 여부를 확인하는 방법과 본인 부담 비용을 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const SECTIONS = [
  { id: "general", heading: "일반건강검진은 2년에 한 번" },
  { id: "cancer", heading: "암검진은 암마다 나이와 주기가 다릅니다" },
  { id: "check", heading: "내가 대상인지 확인하는 방법" },
  { id: "cost", heading: "비용은 얼마나 들까" },
] as const;

const CANCER_ROWS: [string, string, string][] = [
  ["위암", "40세 이상", "2년"],
  ["대장암", "50세 이상", "1년"],
  ["간암", "40세 이상 간암 고위험군", "6개월"],
  ["유방암", "40세 이상 여성", "2년"],
  ["자궁경부암", "20세 이상 여성", "2년"],
  ["폐암", "54~74세 폐암 고위험군", "2년"],
];

const STEPS = [
  "국민건강보험공단 누리집(www.nhis.or.kr)이나 모바일 앱 ‘건강보험25시’에 로그인합니다.",
  "건강모아 → 나의 건강 → 검진대상 조회를 누릅니다.",
  "본인 인증을 하면 올해 검진 대상 여부를 확인하고 검진대상 확인서를 출력할 수 있습니다. 전화(공단 고객센터 1577-1000)로도 문의할 수 있습니다.",
];

const heading = (id: (typeof SECTIONS)[number]["id"]) => SECTIONS.find((s) => s.id === id)!.heading;

export default function NationalCheckupEligibilityPage() {
  return (
    <InfoPage
      title="올해 내가 국가건강검진 대상일까?"
      subtitle="국가건강검진 · 읽는 데 3분"
      trail={[{ label: "검진 안내", href: "/checkup" }, { label: "국가건강검진 대상 확인" }]}
      wide
      bare
    >
      <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1fr)_240px] md:items-start">
        <article className={INFO_ARTICLE}>
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="m-0 text-sm font-bold text-emerald-800">한 줄 요약</p>
            <p className="m-0 text-emerald-950">
              2026년은 짝수 해라서, 짝수 연도에 태어난 분이 일반건강검진 대상입니다. 정확한 대상
              여부는 국민건강보험공단에서 바로 확인할 수 있습니다.
            </p>
          </div>

          <InfoSection id="general" heading={heading("general")}>
            <p className={INFO_P}>
              지역가입자 세대주와 직장가입자, 20세 이상 세대원과 피부양자는 2년마다
              일반건강검진을 받습니다. 태어난 해가 짝수면 짝수 해에, 홀수면 홀수 해에 받는
              식입니다. 사무직이 아닌 직장가입자는 매년 받습니다.
            </p>
          </InfoSection>

          <InfoSection id="cancer" heading={heading("cancer")}>
            {/* 모바일은 글씨·여백을 줄이고 긴 칸은 단어 단위로 줄바꿈해 화면 폭에 맞춘다.
                아주 좁은 화면에서 그래도 넘치면 표만 가로 스크롤(페이지는 밀리지 않음) */}
            <div className="overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
              <table className="w-full break-keep border-collapse text-left text-[14px] sm:text-[15px]">
                <thead className="bg-slate-100 text-sm text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 sm:px-4 sm:py-2.5 font-bold">암 종류</th>
                    <th scope="col" className="px-3 py-2 sm:px-4 sm:py-2.5 font-bold">대상</th>
                    <th scope="col" className="px-3 py-2 sm:px-4 sm:py-2.5 font-bold">주기</th>
                  </tr>
                </thead>
                <tbody>
                  {CANCER_ROWS.map(([name, target, cycle]) => (
                    <tr key={name} className="border-t border-slate-100">
                      <th scope="row" className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2.5 font-bold text-slate-900">{name}</th>
                      <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-slate-700">{target}</td>
                      <td className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2.5 text-slate-700">{cycle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoSection>

          <InfoSection id="check" heading={heading("check")}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {STEPS.map((step, i) => (
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
          </InfoSection>

          <InfoSection id="cost" heading={heading("cost")}>
            <p className={INFO_P}>
              일반건강검진은 본인 부담이 없습니다. 암검진은 검진비의 10%를 내며, 대장암과
              자궁경부암 검진은 본인 부담이 없습니다. 건강보험료 하위 50%(전년도 11월 보험료
              기준)에 해당하는 분과 의료급여수급권자는 암검진도 본인 부담이 없습니다.
            </p>
          </InfoSection>

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
            <p className="m-0">
              출처: 국민건강보험공단 건강검진 실시안내(일반건강검진·암검진), 2026년 일반(암)건강검진 안내문
            </p>
            <p className="m-0">작성 건강검진병원.com 운영자 · 확인일 2026년 10월 2일</p>
            <p className="m-0">검진 제도는 바뀔 수 있으니 정확한 내용은 공단에 확인해 주세요.</p>
          </div>
        </article>

        {/* 데스크톱은 오른쪽 사이드(따라 내려옴), 모바일은 본문 아래 */}
        <aside className="flex flex-col gap-5 md:sticky md:top-6 md:pt-4">
          <nav aria-label="이 글의 순서" className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="m-0 text-sm font-bold text-slate-900">이 글의 순서</p>
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-slate-600 hover:text-slate-900 hover:underline">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="m-0 text-sm font-bold text-slate-900">함께 읽기</p>
            <Link href="/checkup" className="text-sm font-bold text-[#2563eb] hover:underline">
              검진 안내 전체 보기 ›
            </Link>
          </div>
        </aside>
      </div>
    </InfoPage>
  );
}
