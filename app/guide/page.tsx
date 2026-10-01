import type { Metadata } from "next";
import {
  CardDemo,
  type CardDemoChip,
  CopyEmail,
  FilterMapDemo,
  GuideReveal,
  SearchDemo,
  type SearchDemoRow,
  StepsDemo,
} from "@/components/GuideDemos";
import HomeBreadcrumb from "@/components/HomeBreadcrumb";
import { hospitals } from "@/lib/hospitals";
import { regionLabel } from "@/lib/detailPages";
import { deriveChips, splitAccessInfo } from "@/lib/noteChips";
import { SITE_URL } from "@/lib/site";
import { TIER_COLORS } from "@/lib/tierColors";
import { Hospital, Tier } from "@/types/hospital";

/**
 * 이용 안내 페이지. 시안(docs/guide-mockup.html)을 옮긴 것이다.
 *
 * **서버 컴포넌트다** — 본문 글이 HTML에 그대로 들어가야 검색엔진과 애드센스가
 * 읽을 수 있다. 움직이는 실연(검색 타이핑·등급 필터와 지도 점·카드 펼침·
 * 수집 단계)만 components/GuideDemos.tsx의 작은 클라이언트 컴포넌트로 뺐다.
 *
 * 시안의 기능 설명은 실제 코드와 대조해 맞지 않는 문장을 고쳤다(예: "국가검진
 * 지정만" 스위치는 아직 화면 표시만 바뀌고 목록을 거르지 않아 설명을 뺐다).
 * 실연 속 병원 값은 하드코딩하지 않고 hospitals.json에서 읽어 와 데이터와
 * 어긋나지 않게 했다.
 */

const TITLE = "이용 안내 | 전국 건강검진 병원";
const DESCRIPTION =
  "전국 건강검진 병원 사이트 이용 방법, 병원 등급과 표시 정보의 뜻, 정보 수집 원칙을 안내합니다.";

export const metadata: Metadata = {
  // 레이아웃의 title.template을 타지 않도록 absolute로 지정한다.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: {
    type: "article",
    locale: "ko_KR",
    url: `${SITE_URL}/guide`,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const TOC = [
  ["about", "이 사이트는"],
  ["find", "병원 찾는 법"],
  ["tier", "병원 등급"],
  ["terms", "표시되는 말의 뜻"],
  ["source", "정보 수집 원칙"],
  ["notice", "유의사항"],
  ["contact", "오류 제보"],
] as const;

const TIER_SHORT: Record<Tier, string> = {
  상급종합병원: "상급종합",
  종합병원: "종합",
  병원: "병원",
  의료원: "의료원",
};

const TIER_DESC: { tier: Tier; text: string }[] = [
  { tier: "상급종합병원", text: "보건복지부가 중증 질환 진료 역량 등을 평가해 지정한 대형 병원입니다." },
  { tier: "종합병원", text: "일정 규모 이상의 병상과 여러 진료과를 갖춘 병원입니다." },
  { tier: "병원", text: "종합병원보다 규모가 작은 병원급 의료기관입니다." },
  { tier: "의료원", text: "지방의료원·보건의료원 등 지역 공공의료를 맡는 병원입니다." },
];

const STEPS = [
  {
    title: "공공 자료로 병원 목록 정리",
    body: "건강보험심사평가원·국민건강보험공단 정보로 지역별 목록을 만듭니다.",
  },
  {
    title: "공식 홈페이지 끝까지 확인",
    body: "첫 화면만이 아니라 검진센터의 비용·절차·결과·오시는 길·예약 메뉴를 모두 엽니다.",
  },
  {
    title: "공단 조회와 대조",
    body: "같은 이름의 병원은 주소와 사업자 정보로 구분합니다.",
  },
  {
    title: "모르는 건 비워 둡니다",
    body: "확인하지 못한 항목은 추측하지 않고 “병원문의”로 남깁니다.",
  },
];

/** 실연에 쓰는 병원. 없으면(데이터 정리로 빠진 경우) 빌드가 바로 실패하게 한다. */
function mustFind(name: string): Hospital {
  const h = hospitals.find((x) => x.name === name);
  if (!h) throw new Error(`이용 안내 실연용 병원을 찾지 못했습니다: ${name}`);
  return h;
}

function buildSearchRows(): SearchDemoRow[] {
  return ["가천대학교 길병원", "가톨릭대학교 서울성모병원", "강남세브란스병원"].map(
    (name) => {
      const h = mustFind(name);
      return {
        tier: h.tier,
        tierShort: TIER_SHORT[h.tier],
        name: h.name,
        region: regionLabel(h),
      };
    }
  );
}

/** 실제 카드와 같은 함수(deriveChips·splitAccessInfo)로 만들어 문구가 어긋나지 않게 한다. */
function buildCardDemo(h: Hospital) {
  const chips: CardDemoChip[] = deriveChips(h).map((c) => ({
    label: c.label,
    style:
      c.kind === "reservation" && c.active !== false
        ? "reservation"
        : c.kind === "national"
          ? c.tone === "green"
            ? "national-green"
            : "national-amber"
          : "info",
  }));
  const { parking, transit } = splitAccessInfo(h.accessInfo);
  const access = [transit, parking].filter(Boolean).join(" / ");
  const rows = [
    { label: "검진비용", value: h.priceRange },
    { label: "결과통보", value: h.resultNotice },
    { label: "식사제공", value: h.mealProvided },
    { label: "주차·교통", value: access },
  ]
    .filter((r): r is { label: string; value: string } => Boolean(r.value))
    .map((r) => r);
  return {
    name: h.name,
    tier: h.tier,
    region: `${h.region.sido} ${h.region.sigungu}`,
    chips,
    rows,
  };
}

/** 카드의 국가검진 칩과 같은 색 조합 */
const PILL_GREEN = "border border-emerald-200 bg-emerald-100 text-emerald-800";
const PILL_AMBER = "border border-amber-200 bg-amber-100 text-amber-800";

const H2 = "m-0 text-2xl font-extrabold tracking-tight text-slate-900";
const DEMO = "min-w-0 rounded-[18px] border border-slate-200 bg-white p-5";
const LIST = "m-0 flex list-disc flex-col gap-2 pl-5";

export default function GuidePage() {
  const searchRows = buildSearchRows();
  const card = buildCardDemo(mustFind("가천대학교 길병원"));

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 text-base leading-[1.7] text-slate-900">
      <GuideReveal />
      <div className="mx-auto flex max-w-[760px] flex-col gap-14">
        {/* 상단 바 */}
        <div className="pt-5">
          <HomeBreadcrumb trail={[{ label: "이용 안내" }]} />
        </div>

        {/* 히어로 */}
        <header
          id="top"
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-100 via-white to-pink-100 px-7 py-10"
        >
          <h1 className="m-0 mb-3 text-[clamp(30px,6vw,44px)] font-extrabold leading-tight tracking-tight">
            이용 안내
          </h1>
          <p className="m-0 max-w-[52ch] text-slate-600">
            병원마다 홈페이지를 하나하나 열어보지 않아도, 지역별 건강검진 병원
            정보를 한곳에서 비교할 수 있도록 만든 사이트입니다. 찾는 법부터
            정보를 모은 원칙까지 안내합니다.
          </p>
          <nav aria-label="목차" className="mt-6 flex flex-wrap gap-2">
            {TOC.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-900 hover:border-blue-600 hover:text-blue-600"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        {/* 이 사이트는 */}
        <section id="about" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>이 사이트는</h2>
          <p className="m-0 max-w-[65ch]">
            건강검진 받을 병원을 고를 때 필요한 정보(검진비용, 결과 받는 방법,
            주차와 교통, 예약 방법)를 지역별로 모아 비교할 수 있게 정리했습니다.
          </p>
          <p className="m-0 max-w-[65ch]">
            특정 병원이나 기관과 관계없는 개인이 운영합니다. 병원 목록은 기본적으로
            가나다순이며(정렬을 &ldquo;추천순&rdquo;으로 바꾸면 등급 순서로 볼 수
            있습니다), 광고나 제휴 여부가 순서나 표시 내용에 영향을 주지 않습니다.
          </p>
        </section>

        {/* 병원 찾는 법 */}
        <section id="find" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>병원 찾는 법</h2>
          <div className={DEMO}>
            <SearchDemo rows={searchRows} />
          </div>
          <ul className={LIST}>
            <li className="max-w-[63ch]">
              <b>검색</b>: 병원 이름이나 지역 이름(예: 수성구, 강릉)을 입력해 찾을
              수 있습니다. 마우스를 쓰는 화면(PC)에서는 검색창 오른쪽 ⌨ 버튼으로
              화면 키보드를 쓸 수도 있습니다.
            </li>
            <li className="max-w-[63ch]">
              <b>시·도 선택</b>: 원하는 시·도를 고르면 그 지역 병원만 보입니다.
            </li>
          </ul>

          <div className={DEMO}>
            <FilterMapDemo />
            <div className="mt-2.5 text-xs text-slate-500">
              예시 화면입니다. 등급을 누르면 해당 병원만 지도에 남습니다.
            </div>
          </div>
          <ul className={LIST}>
            <li className="max-w-[63ch]">
              <b>등급 필터</b>: 상급종합병원·종합병원·병원·의료원 중 하나를 골라 볼
              수 있습니다.
            </li>
            <li className="max-w-[63ch]">
              <b>지도</b>: 병원 위치가 등급별 색으로 표시됩니다. 표시를 누르면(PC에서는
              마우스를 올려도) 병원 이름·등급·지역·전화번호가 보입니다. 화면을 그대로
              두면 등급 보기가 몇 초마다 자동으로 바뀌고, 등급 필터를 누르거나 지도를
              움직이거나 표시를 누르면 멈춥니다.
            </li>
          </ul>

          <div className={DEMO}>
            <CardDemo {...card} />
          </div>
          <ul className={LIST}>
            <li className="max-w-[63ch]">
              <b>병원 카드</b>: 온라인 예약, 전화, 국가검진 지정 여부를 한눈에 볼 수
              있습니다. &ldquo;자세히 보기&rdquo;를 누르면 검진비용·결과통보·식사제공·주차·교통·주소
              정보가 펼쳐집니다.
            </li>
            <li className="max-w-[63ch]">
              <b>상세 페이지</b>: 병원 이름이나 &ldquo;상세 페이지&rdquo;를 누르면 병원별
              안내 페이지에서 검진 정보와 위치 지도, 같은 지역의 다른 검진 병원까지 볼
              수 있습니다.
            </li>
          </ul>
        </section>

        {/* 병원 등급 */}
        <section id="tier" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>병원 등급 안내</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TIER_DESC.map(({ tier, text }) => (
              <div
                key={tier}
                className="flex flex-col gap-1.5 rounded-[14px] border border-slate-200 bg-white p-4"
              >
                <i
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  style={{
                    background: TIER_COLORS[tier].marker,
                    borderRadius: "50% 50% 50% 0",
                    transform: "rotate(-45deg)",
                  }}
                />
                <b className="text-[15px]">{tier}</b>
                <span className="text-sm text-slate-500">{text}</span>
              </div>
            ))}
          </div>
          <p className="m-0 text-sm text-slate-500">
            등급은 진료 규모를 나누는 기준일 뿐, 검진 품질의 순위를 뜻하지 않습니다.
          </p>
        </section>

        {/* 표시되는 말의 뜻 */}
        <section id="terms" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>표시되는 말의 뜻</h2>
          <div className="flex flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white">
            {[
              {
                key: <span className={`justify-self-start rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL_GREEN}`}>국가검진 지정기관</span>,
                text: "국민건강보험공단 검진기관 조회에서 일반검진 또는 암검진 기관으로 확인된 병원입니다.",
              },
              {
                key: <span className={`justify-self-start rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL_AMBER}`}>국가검진 미지정</span>,
                text: "공단 조회에서 지정 내역을 확인하지 못한 병원입니다. 병원 자체 검진은 운영할 수 있습니다.",
              },
              {
                key: <b>병원문의</b>,
                text: "병원 공식 홈페이지에서 확인하지 못했거나 아직 정리하지 못한 항목입니다. 정보가 없다는 뜻이 아니니 병원에 직접 확인해 주세요.",
              },
              {
                key: <b>온라인예약 (미제공)</b>,
                text: "병원 홈페이지에서 온라인 검진 예약 경로를 찾지 못한 경우입니다. 전화 등으로 병원에 직접 예약해 주세요.",
              },
              {
                key: <b>정보 확인일</b>,
                text: "해당 병원 정보를 마지막으로 확인한 날짜입니다. 상세 페이지 아래쪽에서 볼 수 있고, 카드의 국가검진 표시에 마우스를 올리거나 눌러도 보입니다.",
              },
            ].map((t, i, arr) => (
              <div
                key={i}
                className={`grid grid-cols-1 gap-0.5 px-4 py-3.5 text-sm sm:grid-cols-[150px_1fr] sm:gap-3 ${
                  i < arr.length - 1 ? "border-b border-slate-200" : ""
                }`}
              >
                {t.key}
                <p className="m-0 text-slate-500">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 정보 수집 원칙 */}
        <section id="source" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>정보는 이렇게 모았습니다</h2>
          <div className={DEMO}>
            <StepsDemo steps={STEPS} />
          </div>
          <p className="m-0 max-w-[65ch]">
            국가검진 지정 여부와 검진 종류는 병원 홈페이지 안내보다 국민건강보험공단
            조회 결과를 따릅니다. 지도는 OpenStreetMap을 사용합니다.
          </p>
        </section>

        {/* 유의사항 */}
        <section id="notice" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>이용 시 유의사항</h2>
          <ul className={LIST}>
            <li className="max-w-[63ch]">
              검진비용, 예약 방법, 운영 시간은 병원 사정에 따라 바뀔 수 있습니다.
              예약 전에 꼭 병원에 확인해 주세요.
            </li>
            <li className="max-w-[63ch]">
              이 사이트의 정보는 병원 선택을 돕는 참고 자료이며, 의학적 상담이나
              진단을 대신하지 않습니다.
            </li>
            <li className="max-w-[63ch]">
              국가건강검진 대상 여부와 검진 항목은 국민건강보험공단 고객센터(1577-1000)나
              공단 홈페이지에서 확인할 수 있습니다.
            </li>
          </ul>
        </section>

        {/* 오류 제보 */}
        <section id="contact" data-reveal className="flex scroll-mt-4 flex-col gap-4">
          <h2 className={H2}>오류 제보·문의</h2>
          <p className="m-0 max-w-[65ch]">
            잘못된 정보, 폐업하거나 이전한 병원, 추가했으면 하는 병원을 알려주시면
            확인 후 반영합니다.
          </p>
          <CopyEmail />
        </section>
      </div>
    </main>
  );
}
