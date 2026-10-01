import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SidoDistrictList, { type DistrictData } from "@/components/SidoDistrictList";
import { DesignatedPill, TierStatPills } from "@/components/RegionBits";
import { detailPath, sidoShort } from "@/lib/detailPages";
import {
  countByTier,
  countDesignated,
  districtsOf,
  hospitalsInSido,
  sidosWithHospitals,
} from "@/lib/regionStats";
import { SIDO_SLUG, homeWithSidoPath, sidoFromSlug, sidoPath } from "@/lib/sidoSlugs";
import { SITE_URL } from "@/lib/site";

/**
 * 병원 찾기 2단계 — 시·도별 시·군·구 목록(시안 ②).
 * 서버 컴포넌트이고, 등급 필터·접기만 SidoDistrictList(클라이언트)가 맡는다.
 * 병원이 있는 시·도만 경로를 만들고 dynamicParams=false라 나머지 slug는 404다.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return sidosWithHospitals().map((sido) => ({ sido: SIDO_SLUG[sido] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string }>;
}): Promise<Metadata> {
  const { sido: slug } = await params;
  const sido = sidoFromSlug(slug);
  if (!sido) return {};
  const n = hospitalsInSido(sido).length;
  const title = `${sido} 건강검진 병원 ${n}곳 | 전국 건강검진 병원`;
  const description = `${sido}의 건강검진 병원 ${n}곳을 시·군·구별로 모았습니다. 등급과 국가검진 지정 여부를 보고 병원별 검진 정보로 이동할 수 있습니다.`;
  const canonical = sidoPath(sido);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}${canonical}`, title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function SidoPage({ params }: { params: Promise<{ sido: string }> }) {
  const { sido: slug } = await params;
  const sido = sidoFromSlug(slug);
  if (!sido) notFound();

  const list = hospitalsInSido(sido);
  if (list.length === 0) notFound();

  const districts: DistrictData[] = districtsOf(sido).map((d) => ({
    sigungu: d.sigungu,
    hospitals: d.hospitals.map((h) => ({
      id: h.id,
      name: h.name,
      tier: h.tier,
      designated: h.nationalScreeningDesignated === true,
      href: detailPath(h.id),
    })),
  }));

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 pb-16 text-[15px] leading-relaxed text-slate-900">
      <div className="mx-auto flex max-w-[960px] flex-col gap-5 pt-5">
        <SiteNav />

        <nav aria-label="현재 위치" className="flex flex-wrap gap-1.5 text-[13px] text-slate-500">
          <Link href="/" className="hover:text-slate-700 hover:underline">
            홈
          </Link>
          <span aria-hidden="true">›</span>
          <Link href="/hospitals" className="hover:text-slate-700 hover:underline">
            병원 찾기
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-slate-700">{sido}</span>
        </nav>

        <header className="flex flex-col gap-2.5 rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-100 via-white to-pink-100 px-6 py-7">
          <h1 className="m-0 text-[clamp(26px,5vw,38px)] font-extrabold leading-tight tracking-tight">
            {`${sido} 건강검진 병원 ${list.length}곳`}
          </h1>
          <p className="m-0 max-w-[60ch] text-slate-600">
            {`${sido}의 검진 병원을 시·군·구별로 모았습니다. 병원 이름을 누르면 병원별 안내로 이동합니다.`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <TierStatPills counts={countByTier(list)} />
            <DesignatedPill count={countDesignated(list)} />
          </div>
        </header>

        <SidoDistrictList
          districts={districts}
          mapHref={homeWithSidoPath(sido)}
          mapLabel={`지도에서 ${sidoShort(sido)} 병원 보기 →`}
        />

        <p className="m-0 text-[13px] text-slate-500">
          시·군·구는 병원이 많은 순서로 보여줍니다. 병원 정보가 다르면{" "}
          <Link href="/guide#contact" className="text-blue-600 hover:underline">
            이용 안내의 오류 제보
          </Link>
          로 알려주세요.
        </p>
      </div>
    </main>
  );
}
