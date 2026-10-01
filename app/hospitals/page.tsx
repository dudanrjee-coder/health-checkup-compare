import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { StatPill, TierBar, TierLegend, TierStatPills } from "@/components/RegionBits";
import { hospitals } from "@/lib/hospitals";
import { countByTier, hospitalsInSido, sidosWithHospitals } from "@/lib/regionStats";
import { sidoPath } from "@/lib/sidoSlugs";
import { SITE_URL } from "@/lib/site";

/**
 * 병원 찾기 1단계 — 전국 시·도 카드 목록(시안 docs/hospitals-mockup.html ①).
 * 서버 컴포넌트라 숫자·시·도 이름·링크가 HTML에 그대로 들어간다. 이 페이지에는
 * 움직이는 부분이 없어 클라이언트 컴포넌트가 상단 메뉴뿐이다.
 * 숫자와 시·도 목록은 전부 hospitals.json에서 계산한다(하드코딩 없음).
 */

const TITLE = "지역별 건강검진 병원 | 전국 건강검진 병원";
const DESCRIPTION =
  "전국 시·도별 건강검진 병원 목록입니다. 지역마다 병원 수와 등급 비율을 보고, 시·군·구별 검진 병원 목록으로 이동할 수 있습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/hospitals" },
  openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}/hospitals`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function HospitalsPage() {
  const total = hospitals.length;
  const tierCounts = countByTier(hospitals);
  const sidos = sidosWithHospitals().map((sido) => {
    const list = hospitalsInSido(sido);
    return { sido, total: list.length, counts: countByTier(list) };
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 pb-16 text-[15px] leading-relaxed text-slate-900">
      <div className="mx-auto flex max-w-[960px] flex-col gap-5 pt-5">
        <SiteNav />

        <nav aria-label="현재 위치" className="flex flex-wrap gap-1.5 text-[13px] text-slate-500">
          <Link href="/" className="hover:text-slate-700 hover:underline">
            홈
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-slate-700">병원 찾기</span>
        </nav>

        <header className="flex flex-col gap-2.5 rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-100 via-white to-pink-100 px-6 py-7">
          <h1 className="m-0 text-[clamp(26px,5vw,38px)] font-extrabold leading-tight tracking-tight">
            지역별 건강검진 병원
          </h1>
          <p className="m-0 max-w-[60ch] text-slate-600">
            지역을 고르면 시·군·구별로 정리된 검진 병원 목록을 볼 수 있습니다. 병원
            이름을 누르면 검진비용, 결과 받는 방법, 주차·교통 정보가 있는 병원별
            안내로 이동합니다.
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <StatPill>{`전국 ${total}곳`}</StatPill>
            <TierStatPills counts={tierCounts} />
          </div>
        </header>

        <TierLegend />

        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 p-0">
          {sidos.map(({ sido, total: n, counts }) => (
            <li key={sido}>
              <Link
                href={sidoPath(sido)}
                className="flex h-full flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-600 focus-visible:border-blue-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-base">{sido}</b>
                  <span className="whitespace-nowrap text-[13px] tabular-nums text-slate-500">
                    {`${n}곳`}
                  </span>
                </div>
                <TierBar counts={counts} total={n} />
                <span className="text-[12.5px] font-bold text-blue-600">목록 보기 ›</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
