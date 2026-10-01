import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HospitalDetailMap from "@/components/HospitalDetailMap";
import { hospitals } from "@/lib/hospitals";
import {
  DETAIL_PAGE_IDS,
  detailPath,
  detailTitle,
  isIndexable,
} from "@/lib/detailPages";
import { INFO_ICONS } from "@/lib/infoIcons";
import { sidoPath } from "@/lib/sidoSlugs";
import { splitAccessInfo } from "@/lib/noteChips";
import { SITE_URL } from "@/lib/site";
import { tierBadgeStyle } from "@/lib/tierColors";
import { Hospital, hasCoords } from "@/types/hospital";

/**
 * 병원 상세 페이지. **서버 컴포넌트다** — 병원명·주소·검진 정보가 HTML에 그대로
 * 들어가야 검색엔진과 애드센스가 읽을 수 있다. 클라이언트로 내려가는 것은 지도뿐이다
 * (`HospitalDetailMap`).
 *
 * hospitals.json의 전체 병원(`DETAIL_PAGE_IDS`)을 빌드 때 정적으로 만들고,
 * `dynamicParams = false`로 목록에 없는 id는 404가 나게 한다.
 *
 * 데이터가 고르지 않은 병원도 같은 페이지로 그린다 — 좌표가 없으면 지도 대신
 * 주소만, 시군구가 없으면 위치 표시에서 그 단계만, 같은 시군구 병원이 없으면
 * 그 섹션을 숨긴다. 검진 정보 표는 항목이 전부 비어도 그대로 둔다(병원문의).
 */

/** 값이 없는 칸 표기. 기존 카드(HospitalCardChips)와 같은 문구를 쓴다 — 두 화면이
 *  다른 말을 쓰면 "병원이 공개하지 않았다"는 같은 뜻이 다르게 읽힌다. */
const EMPTY_TEXT = "병원문의";

/** 목록 아래 "다른 검진병원"에 최대 몇 곳까지 보여줄지 */
const NEARBY_LIMIT = 5;

export const dynamicParams = false;

export function generateStaticParams() {
  return DETAIL_PAGE_IDS.map((id) => ({ id }));
}

function findHospital(id: string): Hospital | undefined {
  return hospitals.find((h) => h.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const hospital = findHospital(id);
  if (!hospital) return {};

  const { sido, sigungu } = hospital.region;
  const designation =
    hospital.nationalScreeningDesignated === true
      ? "국가건강검진 지정기관"
      : hospital.nationalScreeningDesignated === false
        ? "국가건강검진 미지정"
        : "국가건강검진 지정 여부 미확인";

  const title = detailTitle(hospital);
  const description = `${sido} ${sigungu} ${hospital.tier}, ${designation}. ${hospital.name}의 검진비용·결과통보·주차·교통·예약 방법을 한눈에 확인하세요.`;
  const canonical = detailPath(hospital.id);

  return {
    // 레이아웃의 title.template(`%s | 전국 건강검진 예약 비교`)을 타지 않도록
    // absolute로 지정한다. 상세 페이지는 접미사가 다르다.
    title: { absolute: title },
    description,
    alternates: { canonical },
    // 검진 정보가 전부 비어 있는 페이지는 색인하지 않는다(링크는 따라가도 됨).
    // 기준은 sitemap과 같은 isIndexable 하나다. 색인 대상이면 레이아웃 기본값을 따른다.
    ...(isIndexable(hospital) ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: `${SITE_URL}${canonical}`,
      title,
      description,
    },
    twitter: { card: "summary", title, description },
  };
}

/** 검진 정보 표의 한 줄. 값이 없어도 행을 숨기지 않는다(카드와 같은 규칙). */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  const filled = Boolean(value && value.trim());
  return (
    <div className="flex gap-3 px-4 py-3">
      {/* 아이콘 배치는 카드 표와 같은 방식(flex + gap-1 + whitespace-nowrap).
          글자가 카드보다 커서(14px) 칸을 w-24로 넓혀 390px에서도 한 줄을 지킨다. */}
      <dt className="flex w-24 shrink-0 items-start gap-1 whitespace-nowrap text-sm font-medium text-slate-500">
        <span aria-hidden>{icon}</span>
        {label}
      </dt>
      <dd
        className={`text-sm leading-relaxed ${
          filled ? "text-slate-800" : "text-slate-400"
        }`}
      >
        {filled ? value : EMPTY_TEXT}
      </dd>
    </div>
  );
}

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hospital = findHospital(id);
  if (!hospital) notFound();

  const { sido, sigungu } = hospital.region;
  // 주차·교통은 accessInfo 한 필드에 합쳐져 있다. 카드와 같은 함수로 나눠야
  // 두 화면이 같은 문장을 같은 칸에 넣는다.
  const { parking, transit } = splitAccessInfo(hospital.accessInfo);

  // 시군구가 비어 있으면 "같은 시군구"를 정할 수 없으므로 목록을 만들지 않는다.
  const nearby = sigungu
    ? hospitals
        .filter(
          (h) =>
            h.id !== hospital.id &&
            h.region.sido === sido &&
            h.region.sigungu === sigungu
        )
        .slice(0, NEARBY_LIMIT)
    : [];

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      {/* 1) 상단 바 */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4">
          <Link
            href="/"
            className="flex h-11 shrink-0 items-center rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            ‹ 목록
          </Link>
          <span className="flex-1 text-center text-sm font-semibold text-slate-900">
            전국 건강검진 병원
          </span>
          {/* 좌우 균형용 빈 칸 — 가운데 제목이 실제로 가운데 오게 한다 */}
          <span className="h-11 w-[52px] shrink-0" aria-hidden />
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-4 pt-4 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
        {/* ── 왼쪽 단(모바일에서는 위쪽): 2~6 ── */}
        <div className="flex flex-col gap-5">
          {/* 2) 위치 표시 */}
          <nav aria-label="현재 위치" className="text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-700 hover:underline">
              홈
            </Link>
            <span className="mx-1.5 text-slate-300">›</span>
            {/* 시·도는 병원 찾기의 시·도 목록 페이지로 연결한다 */}
            <Link href={sidoPath(sido)} className="hover:text-slate-700 hover:underline">
              {sido}
            </Link>
            <span className="mx-1.5 text-slate-300">›</span>
            {/* 시군구가 비어 있으면 이 단계만 생략한다 */}
            {sigungu && (
              <>
                <span>{sigungu}</span>
                <span className="mx-1.5 text-slate-300">›</span>
              </>
            )}
            <span className="text-slate-700">{hospital.name}</span>
          </nav>

          {/* 3) 병원명 + 배지 + 주소 */}
          <section className="flex flex-col gap-3">
            <h1 className="text-[26px] font-bold leading-tight text-slate-900">
              {hospital.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={tierBadgeStyle(hospital.tier)}
              >
                {hospital.tier}
              </span>
              {/* 지정일 때만 배지를 단다(미지정·미확인은 배지 없음) */}
              {hospital.nationalScreeningDesignated === true && (
                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  국가검진 지정기관
                </span>
              )}
              {hospital.affiliation && (
                <span className="text-xs text-slate-500">
                  {hospital.affiliation}
                </span>
              )}
            </div>
            {hospital.address && (
              <p className="text-sm leading-relaxed text-slate-600">
                📍 {hospital.address}
              </p>
            )}
          </section>

          {/* 4) 버튼 — 모두 높이 44px 이상 */}
          <section className="flex flex-col gap-2">
            {hospital.bookingUrl && (
              <a
                href={hospital.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                온라인 검진 예약
                {hospital.bookingType === "예약신청" && (
                  <span className="ml-1.5 text-xs font-normal text-blue-100">
                    (상담원 콜백)
                  </span>
                )}
              </a>
            )}
            <div className="flex gap-2">
              {hospital.phone && (
                <a
                  href={`tel:${hospital.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  📞 {hospital.phone}
                </a>
              )}
              {hospital.sourceUrl && (
                <a
                  href={hospital.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  검진센터 홈페이지 ↗
                </a>
              )}
            </div>
          </section>

          {/* 5) 검진 정보 표 */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              검진 정보
            </h2>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              <InfoRow
                icon={INFO_ICONS.price}
                label="검진비용"
                value={hospital.priceRange}
              />
              <InfoRow
                icon={INFO_ICONS.result}
                label="결과통보"
                value={hospital.resultNotice}
              />
              {/* 검진 소요시간은 현재 스키마에 필드가 없다. waitingPeriod는
                  "예약 대기 기간"이라 다른 개념이므로 끌어다 쓰지 않는다.
                  note를 파싱하지도 않는다 — 값이 생기면 여기에 연결한다. */}
              <InfoRow icon={INFO_ICONS.duration} label="소요시간" />
              <InfoRow
                icon={INFO_ICONS.meal}
                label="식사제공"
                value={hospital.mealProvided}
              />
              <InfoRow icon={INFO_ICONS.parking} label="주차" value={parking} />
              <InfoRow icon={INFO_ICONS.transit} label="교통" value={transit} />
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              「{EMPTY_TEXT}」는 병원 홈페이지에서 확인하지 못한 항목입니다.
              정확한 내용은 병원에 문의해 주세요.
            </p>
          </section>

          {/*
            6) 공단 지정 검진 종류 칩 — 만들지 않았다.
            hospitals.json에는 nationalScreeningDesignated(boolean) 하나뿐이고
            검진 종류(일반·위암·대장암…)를 담는 구조화된 필드가 없다. note 산문을
            파싱해서 만들지 말라는 지시에 따라 섹션 자체를 생략한다.
            종류 필드가 스키마에 추가되면 여기에 칩을 넣으면 된다.
          */}
        </div>

        {/* ── 오른쪽 단(모바일에서는 아래쪽): 7~10 ── */}
        <div className="mt-5 flex flex-col gap-5 md:mt-0">
          {/* 7) 지도. 좌표가 없는 병원은 빈 지도를 띄우지 않고 주소만 보여 준다. */}
          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              위치
            </h2>
            {hasCoords(hospital) ? (
              <div className="h-[200px] w-full md:h-[300px]">
                <HospitalDetailMap hospital={hospital} />
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                📍 {hospital.address || `${sido} ${sigungu}`.trim()}
              </p>
            )}
          </section>

          {/* 8) 같은 시군구의 다른 검진병원 — 각 병원 상세 페이지로 연결 */}
          {nearby.length > 0 && (
            <section>
              {/* 텍스트 노드를 쪼개면 SSR HTML에 `<!-- -->` 구분자가 끼므로
                  한 문자열로 만들어 둔다. */}
              <h2 className="mb-2 text-base font-semibold text-slate-900">
                {`${sigungu} 다른 검진병원`}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {nearby.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={detailPath(h.id)}
                      className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-700">
                        {h.name}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={tierBadgeStyle(h.tier)}
                      >
                        {h.tier}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 9) 확인일 · 출처 · 제보 */}
          <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">
            <p>
              정보 확인일{" "}
              <time dateTime={hospital.verifiedAt} className="text-slate-700">
                {hospital.verifiedAt}
              </time>
            </p>
            <p className="mt-1.5">
              출처: 병원 공식 홈페이지, 국민건강보험공단 검진기관 조회
            </p>
            <p className="mt-1.5">
              정보가 다르면 알려주세요 —{" "}
              <a
                href={`mailto:youngmukjee@gmail.com?subject=${encodeURIComponent(
                  `[정보 정정] ${hospital.name}`
                )}`}
                className="text-blue-600 hover:underline"
              >
                youngmukjee@gmail.com
              </a>
            </p>
          </section>

          {/* 10) 목록으로 돌아가기 */}
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            ‹ 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
