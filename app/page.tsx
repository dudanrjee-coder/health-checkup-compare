"use client";

import Link from "next/link";
import { CSSProperties, Fragment, useEffect, useMemo, useRef, useState } from "react";
import HospitalMap from "@/components/HospitalMapLazy";
import SiteNav from "@/components/SiteNav";
import { CONTACT_EMAIL, useCopyEmail } from "@/lib/useCopyEmail";
import { sidoFromSlug, sidoPath } from "@/lib/sidoSlugs";
import { articlePath, articlesByRecency } from "@/lib/articles";
import { sidoShort } from "@/lib/detailPages";
import { sidosWithHospitals } from "@/lib/regionStats";
import BgmPlayer from "@/components/BgmPlayer";
import HeroVideo from "@/components/HeroVideo";
import HeroBackdrop from "@/components/HeroBackdrop";
import HeroStatValue from "@/components/HeroStatValue";
import SidoSelect from "@/components/SidoSelect";
import TierFilter from "@/components/TierFilter";
import HospitalCardChips from "@/components/HospitalCardChips";
import SearchBox from "@/components/SearchBox";
import DateTimeClock from "@/components/DateTimeClock";
import VisitorCounter from "@/components/VisitorCounter";
import { hasCoords, Sido, Tier, TIER_LIST } from "@/types/hospital";
import {
  filterHospitals,
  findUniqueSidoMatch,
  getHeaderStats,
  getSidosWithData,
  getTierCounts,
  getTiersWithData,
  SortOption,
} from "@/lib/hospitals";

/** 홈 맨 아래 운영 안내 링크 줄 */
const FOOTER_LINKS = [
  { label: "사이트 소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "문의", href: "/contact" },
];

/**
 * 홈에 거는 검진 안내 글 4편. 글에 작성일 필드가 없어 "최신순"을 만들 수 없으므로
 * `ARTICLE_GROUPS`에 적힌 순서(국가건강검진 → 암검진 → 검진 전후)의 앞 4편을 쓴다.
 */
const HOME_ARTICLES = articlesByRecency().slice(0, 4);

/** 홈에 거는 시·도 링크 — 병원이 한 곳이라도 있는 시·도만 */
const HOME_SIDOS = sidosWithHospitals();

/** 유휴 자동 순환이 도는 등급 필터 순서. null은 "전체"다. */
const IDLE_CYCLE_SEQUENCE: (Tier | null)[] = [null, ...TIER_LIST];
const IDLE_CYCLE_INTERVAL_MS = 5000;

/** 서버 HTML에 미리 넣어 둘 병원 카드 수. 첫 화면을 채우고도 남는 정도면 된다. */
const SSR_CARD_LIMIT = 20;

export default function Home() {
  const [selectedSido, setSelectedSido] = useState<Sido | null>(null);
  // 등급 필터는 단일 선택이다(라디오 버튼처럼) — null이면 "전체".
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  // 기본 정렬은 가나다순(병원명 오름차순). "추천순"은 등급 우선순위 정렬이다.
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  // 리스트 패널(데스크톱) 또는 페이지 전체(모바일)를 300px 이상 내렸을 때만
  // "맨 위로 가기" 버튼을 보여준다. lg 미만에서는 리스트 패널이 자체 스크롤을
  // 갖지 않고 페이지 전체(window)가 스크롤되므로 두 소스를 함께 감시해야 한다.
  const [sectionScrolled, setSectionScrolled] = useState(false);
  const [windowScrolled, setWindowScrolled] = useState(false);
  const showBackToTop = sectionScrolled || windowScrolled;
  const listScrollRef = useRef<HTMLElement | null>(null);
  const handleListScroll = (event: React.UIEvent<HTMLElement>) => {
    setSectionScrolled(event.currentTarget.scrollTop > 300);
  };
  useEffect(() => {
    const handleWindowScroll = () => {
      setWindowScrolled(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);
  const scrollListToTop = () => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  /**
   * 엔터로 확정했는데 지역명도 아니고 병원 검색 결과도 0건일 때만 켠다.
   * 타이핑 도중에는 결과가 잠깐 0건이 되는 일이 흔하므로 그때는 켜지 않는다.
   */
  const [submittedNoMatch, setSubmittedNoMatch] = useState(false);
  /**
   * "국가검진 지정만" 토글의 시각적 상태만 들고 있다. 아직 results 필터링에는
   * 연결하지 않았다 — 실제 필터 로직은 다음 작업에서 붙일 예정이다.
   */
  const [nationalOnly, setNationalOnly] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /**
   * 유휴 상태 등급 필터 자동 순환. 페이지가 켜져 있는 동안 상호작용이 한
   * 번도 없으면 "전체 → 상급종합병원 → 종합병원 → 병원 → 의료원 → 전체"를
   * 5초마다 반복한다.
   *
   * 멈추는 이유가 두 가지이고, **되돌릴 수 있는지가 서로 다르다.**
   *
   * - `userStoppedCycle`(영구): 필터 버튼 클릭, 지도 드래그/줌, 마커 클릭,
   *   **시·도 선택**(드롭다운과 검색창 엔터 양쪽).
   *   사용자가 직접 고른 상태를 자동으로 덮어쓰지 않는다. 새로고침 전까지 재개 안 함.
   * - **검색 중**(일시): 검색어가 한 글자라도 있으면 멈춘다. 검색어를 다 지우면
   *   (그리고 등급을 직접 고른 적이 없으면) 다시 돈다.
   *
   * 검색 중 멈추는 이유: `results`는 검색어와 등급 필터를 **함께** 적용하므로,
   * 순환이 등급을 바꾸는 순간 검색 결과가 사라졌다. "삼성서"를 입력하면 상급종합
   * 구간에서는 삼성서울병원이 보이다가 종합병원 구간으로 넘어가면 "검색 병원 0곳"이
   * 됐다. 검색어를 넣은 사람이 기대하는 건 전국·전체 등급에서 이름으로 찾는 것이다.
   */
  const [userStoppedCycle, setUserStoppedCycle] = useState(false);
  const idleCycleIndexRef = useRef(0);
  const stopIdleCycle = () => setUserStoppedCycle(true);
  /**
   * 순환 중단 판정은 **디바운스 전 `searchInput`**으로 한다. `query`(200ms 뒤)로
   * 하면 첫 글자를 넣은 직후 200ms 동안 순환이 살아 있어, 그 사이 타이머가 돌면
   * 등급이 한 번 더 바뀐다.
   */
  const isSearchTyping = searchInput.trim().length > 0;
  const idleCycleActive = !userStoppedCycle && !isSearchTyping;

  useEffect(() => {
    if (!idleCycleActive) return;
    const timer = setInterval(() => {
      idleCycleIndexRef.current =
        (idleCycleIndexRef.current + 1) % IDLE_CYCLE_SEQUENCE.length;
      setSelectedTier(IDLE_CYCLE_SEQUENCE[idleCycleIndexRef.current]);
    }, IDLE_CYCLE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [idleCycleActive]);

  /**
   * `/?sido=daegu`처럼 시·도 slug가 붙어 오면 그 시·도를 미리 선택한다
   * (병원 찾기의 "지도에서 ○○ 병원 보기" 링크). 드롭다운으로 고른 것과 같은
   * handleSidoChange를 쓴다. 모르는 slug면 아무것도 하지 않는다.
   *
   * useSearchParams 대신 마운트 때 location.search를 한 번 읽는다 — 이 페이지에서
   * useSearchParams를 쓰면 Suspense 경계가 필요해지고 홈 전체가 정적 프리렌더에서
   * 빠진다. 파라미터가 없으면 기존 동작과 완전히 같다.
   */
  useEffect(() => {
    const sido = sidoFromSlug(
      new URLSearchParams(window.location.search).get("sido")
    );
    if (sido) handleSidoChange(sido);
    // 최초 1회만 읽는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 입력할 때마다 필터링하지 않도록 200ms 디바운스를 둔다.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = query.trim().length > 0;

  const sidosWithData = useMemo(() => getSidosWithData(), []);
  const headerStats = useMemo(() => getHeaderStats(), []);
  /**
   * "조회 기준일" 표시. 데이터 검증 시점(verifiedAt)이 아니라 사용자가
   * 이 페이지를 연 날짜(MM/DD)다. 서버 렌더링 시점엔 알 수 없으므로
   * 마운트 후에만 채운다(hydration mismatch 방지 — DateTimeClock과 같은
   * 이유).
   */
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  useEffect(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setTodayLabel(`${pad(today.getMonth() + 1)}/${pad(today.getDate())}`);
  }, []);
  // 문의 이메일 클립보드 복사 — 복사 성공 시 잠깐 "복사됨"으로 바뀌었다가 되돌아간다.
  // 이용 안내 페이지와 같은 로직을 쓰도록 lib/useCopyEmail.ts로 옮겼다.
  const { copied: contactEmailCopied, copy: handleCopyContactEmail } =
    useCopyEmail();
  // 검색 중에는 지역 선택을 무시하므로 등급 목록도 전국 기준으로 계산한다.
  const tiersWithData = useMemo(
    () => getTiersWithData(isSearching ? null : selectedSido),
    [isSearching, selectedSido]
  );
  // 등급 필터 옆 개수 배지도 같은 범위(검색 중엔 전국)로 맞춘다.
  const tierCounts = useMemo(
    () => getTierCounts(isSearching ? null : selectedSido),
    [isSearching, selectedSido]
  );
  // "전체" 버튼 숫자는 tierCounts 총합과 항상 같은 범위로 맞춘다.
  const allCount = useMemo(
    () => Object.values(tierCounts).reduce((sum, n) => sum + n, 0),
    [tierCounts]
  );

  // 아직 데이터가 없는 지역을 고른 경우(현재는 없지만 시/도가 늘어나면 발생)
  const isPreparingRegion = selectedSido
    ? !sidosWithData.has(selectedSido)
    : false;

  // 지역을 고르지 않았으면 전국 목록을 보여준다.
  const results = useMemo(
    () => filterHospitals(selectedSido, selectedTier, query, sortBy),
    [selectedSido, selectedTier, query, sortBy]
  );

  const mappableResults = useMemo(() => results.filter(hasCoords), [results]);

  /**
   * 빌드 때 만드는 홈 HTML에는 카드 앞 SSR_CARD_LIMIT장만 넣고, 나머지는
   * 마운트 직후 그린다. 전체 971곳을 HTML에 넣으면 홈 한 장이 4.7MB가 되어
   * Vercel Fast Origin Transfer를 대부분 잡아먹는다. 첫 렌더는 서버와 같아야
   * 하므로(하이드레이션 불일치 방지) useEffect로만 전체 목록으로 넘긴다.
   */
  const [listMounted, setListMounted] = useState(false);
  useEffect(() => setListMounted(true), []);
  const renderedResults = listMounted
    ? results
    : results.slice(0, SSR_CARD_LIMIT);

  // 검색 결과가 바뀌면 이전에 고른 병원이 목록에서 빠질 수 있으므로 선택을 푼다.
  useEffect(() => {
    setSelectedHospitalId(null);
  }, [query]);

  // 지도에서 마커를 고르면 해당 카드가 보이도록 스크롤한다.
  useEffect(() => {
    if (!selectedHospitalId) return;
    cardRefs.current[selectedHospitalId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedHospitalId]);

  /**
   * 지역 선택으로 넘기고 검색창을 비운다.
   *
   * **엔터(handleSearchSubmit)에서만 호출된다.** 타이핑 도중에는 어떤 경로로도
   * 검색창 값을 프로그램이 건드리지 않으므로, 한글 IME 조합 상태와 부딪힐 일이
   * 구조적으로 없다. SearchBox가 조합 중(isComposing)인 엔터를 무시하기 때문에
   * 이 함수가 도는 시점에는 조합이 이미 확정돼 있다.
   *
   * 예전에는 타이핑 중 자동 전환 때문에 blur로 조합을 강제 확정시키고 포커스를
   * 되돌리는 우회로가 있었는데, 자동 전환을 없애면서 함께 걷어냈다(43번 항목).
   *
   * 지역을 고른 것도 사용자가 직접 한 선택이므로 **등급 자동 순환을 영구히
   * 멈춘다**(2026-11-08). 멈추지 않으면 "부산"을 고른 뒤에도 5초마다 등급이
   * 바뀌어 부산 목록 수가 저절로 오르내린다. 등급은 "전체"로 맞춰, 전환하는
   * 순간 순환이 어느 등급에 있었든 그 지역 병원이 다 보이게 한다.
   */
  function switchToSido(sido: Sido) {
    stopIdleCycle();
    setSelectedSido(sido);
    setSelectedTier(null);
    setSelectedHospitalId(null);
    setSearchInput("");
    setQuery("");
    setSubmittedNoMatch(false);
  }

  /**
   * 엔터로 검색을 확정했을 때만 부분 일치까지 포함해 지역명을 판정한다.
   * - "부산" → 부산광역시로 전환 (부분 일치지만 유일하게 좁혀짐)
   * - "세브란스" → 지역이 아니므로 검색 상태 유지
   * - "aaaaa" → 지역도 아니고 병원 결과도 0건이면 안내 문구
   */
  function handleSearchSubmit() {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const matchedSido = findUniqueSidoMatch(trimmed);
    if (matchedSido) {
      switchToSido(matchedSido);
      return;
    }

    // 디바운스를 기다리지 않고 이 검색어로 즉시 확정한다.
    setQuery(trimmed);
    setSelectedHospitalId(null);
    // 결과 판정은 results와 같은 기준(전국 + 등급 필터)으로 계산한다.
    setSubmittedNoMatch(
      filterHospitals(null, selectedTier, trimmed).length === 0
    );
  }

  function handleSearchChange(value: string) {
    const wasEmpty = searchInput.trim().length === 0;
    const nowTyping = value.trim().length > 0;
    setSearchInput(value);
    /**
     * **검색을 시작하는 순간에만** 등급을 "전체"로 되돌린다.
     *
     * 빈 칸 → 글자가 들어온 전환에서만 하는 것이 중요하다. 글자가 들어올 때마다
     * 되돌리면, 검색 중에 사용자가 등급을 직접 고른 것(상급종합병원만 보기)이
     * 다음 타이핑에 지워진다.
     *
     * 순환 색인도 처음으로 돌린다 — 검색어를 다 지워 순환이 재개될 때 화면의
     * 등급("전체")과 순환이 가리키는 자리가 어긋나지 않게 한다.
     */
    if (wasEmpty && nowTyping) {
      setSelectedTier(null);
      idleCycleIndexRef.current = 0;
    }
    // 다시 입력하기 시작하면 이전 엔터의 안내 문구는 걷는다.
    if (submittedNoMatch) setSubmittedNoMatch(false);
  }

  /**
   * 시·도 드롭다운. switchToSido와 같은 이유로 등급 자동 순환을 멈추고 등급을
   * "전체"로 맞춘다(2026-11-08). 검색창을 비우지 않는 것만 다르다 — 이 함수는
   * 검색 중이 아닐 때 쓰이고, 마운트 때 `?sido=` 파라미터를 읽는 경로도 여기로 온다.
   */
  function handleSidoChange(sido: Sido) {
    stopIdleCycle();
    setSelectedSido(sido);
    setSelectedTier(null);
    setSelectedHospitalId(null);
    setSubmittedNoMatch(false);
  }

  /** 등급 필터는 라디오 버튼처럼 동작한다 — 새로 고른 등급이 이전 선택을 대체한다. */
  function handleTierSelect(tier: Tier) {
    stopIdleCycle();
    setSelectedHospitalId(null);
    setSelectedTier(tier);
  }

  function handleClearTiers() {
    stopIdleCycle();
    setSelectedHospitalId(null);
    setSelectedTier(null);
  }

  /** 지도 마커 클릭. 카드 목록 클릭(별도 핸들러)과 달리 유휴 순환을 멈춘다. */
  function handleMapMarkerSelect(id: string) {
    stopIdleCycle();
    setSelectedHospitalId(id);
  }

  return (
    <main>
      {/* 시안처럼 좌우 여백 없이 화면 끝까지 채우는 풀블리드 배너다. 안쪽
          콘텐츠만 max-w-7xl로 가운데 정렬한다. */}
      {/* 진입 모션은 히어로 안에만 있다. --hero-delay가 등장 순서를 만들고
          (배지 0 → 원형 영상 60 → 제목 120 → 부제 180 → 통계 240 → BGM 300ms),
          마지막 요소까지 680ms에 끝난다. 규칙은 app/globals.css에 모아 뒀다.
          relative는 배경 빛 덩어리(HeroBackdrop)를 히어로 안에 가두기 위한 것이다. */}
      <header className="relative overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-50 to-pink-100 px-5 py-8 sm:px-10 sm:py-10">
        <HeroBackdrop />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
          {/*
            상단 네비게이션 — 병원 찾기(/hospitals)·검진 안내(/checkup)·이용 안내
            (/guide) 세 항목 모두 실제 페이지로 연결된다. 항목 목록과 링크·알약·
            현재 페이지 스타일 규칙은 components/SiteNav.tsx에 있다. 로고 텍스트와 검진예약
            버튼을 걷어낸 뒤로는 좌우에 짝이 되는 요소가 없어서, 그리드 대신
            가운데 정렬 한 줄로 둔다. 모바일에서는 nav가 통째로 비지 않도록
            메뉴를 그대로 노출하고, 폭이 모자라면 줄바꿈시킨다.
          */}
          <SiteNav />

          <div className="flex flex-col items-center gap-4 text-center">
            <span
              className="hero-fade w-fit rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
              style={{ "--hero-delay": "0ms" } as CSSProperties}
            >
              2026 국가건강검진 시즌
            </span>
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
              {/* 원형 영상은 HeroVideo가 그대로 그린다(마스킹·재생 속성 손대지
                  않음). 여기서는 바깥에 궤도 링만 덧그린다 — 링은 형제 요소라
                  영상 위에 겹치지 않고, pointer-events-none이라 호버로 소리를
                  켜는 동작도 그대로다. */}
              <div
                className="hero-fade relative shrink-0"
                style={{ "--hero-delay": "60ms" } as CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className="hero-orbit pointer-events-none absolute -inset-2 rounded-full border border-dashed border-blue-500/45 md:-inset-3"
                >
                  {/* 링을 따라 도는 작은 점. 링이 회전하면 함께 돈다. */}
                  <span className="absolute -top-[4.5px] left-1/2 block h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-blue-600 ring-4 ring-blue-600/20" />
                </span>
                <HeroVideo />
              </div>
              <div className="text-center md:text-left">
                {/* h1·부제는 LCP 후보라 opacity를 건드리지 않고 transform만
                    움직인다(globals.css의 hero-lift). */}
                <h1
                  className="hero-lift break-keep text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
                  style={{ "--hero-delay": "120ms" } as CSSProperties}
                >
                  전국 건강검진 병원
                </h1>
                <p
                  className="hero-lift mt-2 text-sm text-slate-600 sm:text-base"
                  style={{ "--hero-delay": "180ms" } as CSSProperties}
                >
                  지역별 검진병원 정보를 한눈에 비교하세요
                </p>
              </div>
            </div>

            <div
              className="hero-lift flex flex-wrap justify-center gap-2"
              style={{ "--hero-delay": "240ms" } as CSSProperties}
            >
              {[
                { label: "전국 병원", value: headerStats.totalHospitals },
                { label: "시·도", value: headerStats.sidoCount },
                {
                  label: "국가검진 지정",
                  value: headerStats.nationalDesignatedCount,
                },
              ].map((stat) => (
                <span
                  key={stat.label}
                  className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
                >
                  {stat.label} <HeroStatValue value={stat.value} />
                </span>
              ))}
            </div>

            {/* 배경음악 컨트롤. 통계 배지 줄 바로 아래 가운데에 둔다.
                등장 모션은 감싸는 <div>에만 걸었다 — BgmPlayer 안쪽(재생/정지
                로직, 자동재생 금지, 웨이브폼)은 한 줄도 건드리지 않는다. */}
            <div
              className="hero-fade"
              style={{ "--hero-delay": "300ms" } as CSSProperties}
            >
              <BgmPlayer />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8">
        {/* 그라디언트 헤더와 검색 카드 사이의 흰 배경 줄. 왼쪽은 시안과
            동일하게 DateTimeClock 하나로 통일했다(점·날짜·시간·상태 문구가
            전부 그 컴포넌트 안에 있다). 오른쪽엔 "조회 기준일"만 별도로
            둔다 — 병원 데이터가 검증된 날짜(verifiedAt)가 아니라 사용자가
            이 페이지를 조회한 날짜라는 뜻을 분명히 하려고 라벨을 바꿨다. */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <DateTimeClock />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {todayLabel && (
              <span className="text-xs text-slate-500">
                조회 기준일 {todayLabel}
              </span>
            )}
            <VisitorCounter />
          </div>
        </div>

        <section className="mb-6 flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/60">
          {/* 검색창(넓게) + 지역 선택(좁게) + 검색 버튼을 한 줄에 배치한다.
              지역 드롭다운은 고르는 즉시 바로 필터링되고, 검색 버튼은 검색창
              엔터(handleSearchSubmit)와 같은 동작을 하는 시각적 트리거다. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBox
                value={searchInput}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
              />
            </div>
            <div className="sm:w-56 sm:shrink-0">
              <SidoSelect
                value={selectedSido}
                onChange={handleSidoChange}
                sidosWithData={sidosWithData}
              />
            </div>
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="shrink-0 rounded-lg bg-[#0c1425] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              검색
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <TierFilter
              selected={selectedTier}
              onSelect={handleTierSelect}
              tiersWithData={tiersWithData}
              tierCounts={tierCounts}
              allCount={allCount}
              onClearAll={handleClearTiers}
            />

            {/*
              "국가검진 지정만" 토글 — 지금은 시각적 상태만 켜고 끈다.
              results 필터링에는 아직 연결하지 않았다. 다음 작업에서
              nationalOnly 값을 filterHospitals 쪽 조건에 실제로 반영할 예정이다.
            */}
            <label className="ml-auto flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-500">
              국가검진 지정만
              <button
                type="button"
                role="switch"
                aria-checked={nationalOnly}
                onClick={() => setNationalOnly((prev) => !prev)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  nationalOnly ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    nationalOnly ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>

          {isSearching && (
            <p className="text-xs text-slate-500">
              검색 중에는 지역 선택을 무시하고 전국에서 찾습니다. 등급 필터는
              함께 적용됩니다.
            </p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* 모바일에서는 지도가 위, 데스크톱에서는 리스트가 왼쪽 */}
          <div className="relative order-2 lg:order-1">
            <section
              ref={listScrollRef}
              onScroll={handleListScroll}
              className="flex flex-col gap-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1"
            >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">
                {isSearching ? (
                  <>
                    <span className="font-medium text-slate-700">
                      &quot;{query.trim()}&quot; 검색
                    </span>{" "}
                    병원 {results.length}곳
                  </>
                ) : selectedSido ? (
                  <>
                    <span className="font-medium text-slate-700">
                      {selectedSido}
                    </span>{" "}
                    검진병원 {results.length}곳
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-700">전국</span>{" "}
                    병원 {results.length}곳
                  </>
                )}
                {results.length > 0 && (
                  <> · 지도 표시 {mappableResults.length}곳</>
                )}
              </p>

              {/*
                정렬 드롭다운 — 기본값은 "가나다순"(병원명 오름차순, lib/hospitals.ts의
                SortOption "name"). "추천순"은 filterHospitals의 등급 우선순위 정렬이다.
              */}
              <select
                aria-label="정렬 기준"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="name">가나다순</option>
                <option value="recommended">추천순</option>
              </select>
            </div>

            {submittedNoMatch ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  일치하는 곳이 없습니다.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  지역 이름(예: 부산, 충청남도)이나 병원 이름으로 다시 검색해
                  보세요.
                </p>
              </div>
            ) : (
              isSearching &&
              results.length === 0 && (
                <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
              )
            )}

            {!isSearching && isPreparingRegion && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                <p className="font-medium text-slate-700">
                  {selectedSido}은(는) 준비 중입니다.
                </p>
                <p className="mt-1">데이터가 추가되는 대로 안내해 드릴게요.</p>
              </div>
            )}

            {!isSearching && !isPreparingRegion && results.length === 0 && (
              <p className="text-sm text-slate-500">
                선택한 조건에 맞는 병원이 없습니다.
              </p>
            )}

            {renderedResults.map((hospital, index) => (
              <HospitalCardChips
                key={hospital.id}
                hospital={hospital}
                index={index}
                selected={hospital.id === selectedHospitalId}
                onSelect={() => setSelectedHospitalId(hospital.id)}
                cardRef={(node) => {
                  cardRefs.current[hospital.id] = node;
                }}
              />
            ))}
            </section>

            <button
              type="button"
              onClick={scrollListToTop}
              aria-label="맨 위로 가기"
              title="맨 위로 가기"
              className={`fixed bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border-[0.5px] border-slate-300 bg-white text-slate-600 shadow-md transition-opacity duration-300 hover:bg-slate-50 lg:absolute ${
                showBackToTop ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ↑
              </span>
            </button>
          </div>

          <div className="order-1 h-[320px] sm:h-[420px] lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100vh-8rem)]">
            <HospitalMap
              hospitals={mappableResults}
              selectedSido={isSearching ? null : selectedSido}
              searchActive={isSearching}
              selectedId={selectedHospitalId}
              onSelect={handleMapMarkerSelect}
              onUserInteraction={stopIdleCycle}
              /**
               * 유휴 자동 순환 중에는 등급이 바뀌어도 마커 크기를 50%로 고정한다.
               *
               * 순환 순서가 "전체 → 상급종합병원 → 종합병원 → 병원 → 의료원"이라,
               * 크기 규칙(전체·병원 50% / 나머지 100%)을 그대로 따르면 전체(50%)
               * 에서 상급종합병원(100%)으로 넘어갈 때 마커가 한 번에 2배가 된다.
               * 가만히 보고 있으면 이 급변이 "보라색 마커만 유독 크다"로 읽힌다
               * (실제로는 상급종합·종합·의료원 마커가 22×29px로 완전히 같다).
               *
               * 사용자가 필터를 직접 누르면 stopIdleCycle로 순환이 멈추므로 그때부터는
               * 원래의 50%/100% 규칙이 그대로 적용된다. 그 시점의 크기 변화는 자기가
               * 누른 것에 대한 반응이라 급변으로 느껴지지 않는다.
               */
              shrinkMarkers={
                idleCycleActive ||
                selectedTier === null ||
                selectedTier === "병원"
              }
              /**
               * 같은 이유로 줌도 고정한다 — 순환 중에는 등급이 바뀌어도 전국
               * 범위를 유지하고, 순환이 멈추면 선택된 병원들에 맞춰 확대한다.
               *
               * `!selectedSido`와 `!isSearching`은 2026-11-08 이후 **둘 다 중복이다** —
               * 시·도 선택과 검색이 모두 순환을 멈추므로 그 상황에서는 idleCycleActive가
               * 이미 false다. 그래도 남겨 둔다. 검색어를 지우거나 지역을 푸는 찰나에
               * (디바운스 200ms 동안 query에 옛 검색어가 남는다) 전국 범위로 되돌아가는
               * 것을 한 박자 늦춰, 지도가 두 번 움직이지 않게 해 준다.
               * 순환 재개 조건이 나중에 느슨해져도 이 두 조건이 안전망으로 남는다.
               */
              lockNationwideView={
                idleCycleActive && !selectedSido && !isSearching
              }
            />
          </div>
        </div>

        {/*
          검진 안내 글·시·도 목록으로 가는 길. 홈의 내부 링크가 병원 카드로만
          나 있어서 글과 지역 페이지로 들어갈 입구가 없었다. 시·도 선택은
          상태(state)로 지도만 움직이므로, 크롤러와 키보드 사용자를 위해 각 시·도
          목록 페이지로 가는 진짜 링크를 따로 둔다.
        */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h2 className="m-0 text-base font-semibold text-slate-900">
              검진 안내
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {HOME_ARTICLES.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={articlePath(a.slug!)}
                    className="text-sm font-medium text-slate-800 hover:text-blue-700 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="m-0 text-xs leading-relaxed text-slate-500">
                    {a.summary}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/checkup"
              className="mt-3 inline-block text-xs text-blue-600 hover:underline"
            >
              검진 안내 전체 보기 →
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h2 className="m-0 text-base font-semibold text-slate-900">
              지역별 병원 목록
            </h2>
            <nav
              aria-label="시·도별 병원 목록"
              className="mt-3 flex flex-wrap gap-x-3 gap-y-2"
            >
              {HOME_SIDOS.map((sido) => (
                <Link
                  key={sido}
                  href={sidoPath(sido)}
                  className="text-sm text-slate-700 hover:text-blue-700 hover:underline"
                >
                  {sidoShort(sido)}
                </Link>
              ))}
            </nav>
            <Link
              href="/hospitals"
              className="mt-3 inline-block text-xs text-blue-600 hover:underline"
            >
              병원 찾기 전체 보기 →
            </Link>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <span>병원 정보 오류 제보 · 제휴 문의</span>
          <button
            type="button"
            onClick={handleCopyContactEmail}
            className="font-medium text-sky-600 underline underline-offset-2 hover:text-sky-700"
          >
            {CONTACT_EMAIL}
          </button>
          <span
            className={`text-xs text-emerald-600 transition-opacity ${
              contactEmailCopied ? "opacity-100" : "opacity-0"
            }`}
          >
            복사됨
          </span>
        </div>

        {/* 운영 안내 링크 — 문의 이메일 상자 아래에 둔다 */}
        <footer className="mt-8 flex flex-col items-center gap-2 border-t border-slate-200 pt-6 pb-2 text-center">
          <nav aria-label="운영 안내" className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-slate-600">
            {FOOTER_LINKS.map((link, i) => (
              <Fragment key={link.href}>
                {i > 0 && <span aria-hidden="true" className="text-slate-300">·</span>}
                <Link
                  href={link.href}
                  className="rounded px-1.5 py-1 hover:text-slate-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {link.label}
                </Link>
              </Fragment>
            ))}
          </nav>
          <p className="m-0 break-keep text-xs leading-relaxed text-slate-500">
            검진 비용과 운영 방식은 병원 사정에 따라 바뀔 수 있으니, 예약 전에 병원에 직접
            확인해 주세요.
          </p>
        </footer>
      </div>
    </main>
  );
}
