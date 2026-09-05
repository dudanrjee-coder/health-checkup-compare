"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HospitalMap from "@/components/HospitalMapLazy";
import SidoSelect from "@/components/SidoSelect";
import TierFilter from "@/components/TierFilter";
import HospitalCardChips from "@/components/HospitalCardChips";
import SearchBox from "@/components/SearchBox";
import DateTimeClock from "@/components/DateTimeClock";
import VisitorCounter from "@/components/VisitorCounter";
import { hasCoords, Sido, Tier } from "@/types/hospital";
import {
  filterHospitals,
  findUniqueSidoMatch,
  getHeaderStats,
  getSidosWithData,
  getTierCounts,
  getTiersWithData,
} from "@/lib/hospitals";

export default function Home() {
  const [selectedSido, setSelectedSido] = useState<Sido | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Set<Tier>>(new Set());
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
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
    () => filterHospitals(selectedSido, selectedTiers, query),
    [selectedSido, selectedTiers, query]
  );

  const mappableResults = useMemo(() => results.filter(hasCoords), [results]);

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
   */
  function switchToSido(sido: Sido) {
    setSelectedSido(sido);
    setSelectedTiers(new Set());
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
      filterHospitals(null, selectedTiers, trimmed).length === 0
    );
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    // 다시 입력하기 시작하면 이전 엔터의 안내 문구는 걷는다.
    if (submittedNoMatch) setSubmittedNoMatch(false);
  }

  function handleSidoChange(sido: Sido) {
    setSelectedSido(sido);
    setSelectedTiers(new Set());
    setSelectedHospitalId(null);
    setSubmittedNoMatch(false);
  }

  function handleTierToggle(tier: Tier) {
    setSelectedHospitalId(null);
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }

  function handleClearTiers() {
    setSelectedHospitalId(null);
    setSelectedTiers(new Set());
  }

  return (
    <main>
      {/* 시안처럼 좌우 여백 없이 화면 끝까지 채우는 풀블리드 배너다. 안쪽
          콘텐츠만 max-w-7xl로 가운데 정렬한다. */}
      <header className="bg-gradient-to-br from-sky-100 via-indigo-50 to-pink-100 px-5 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {/*
            상단 네비게이션 — 시안에만 있는 디자인 목업용 요소다. 병원
            찾기/검진 항목/비용 비교/이용 안내 페이지도, 검진예약 기능도
            실제로는 없다. 실제 페이지가 생기기 전까지는 눌러도 아무 동작을
            하지 않는 순수 시각 요소로만 둔다(href 없음, onClick 없음).
          */}
          <nav className="grid grid-cols-2 items-center gap-3 sm:grid-cols-3">
            <span className="text-sm font-semibold text-slate-900">
              전국 건강검진 병원
            </span>
            <ul className="col-span-2 hidden items-center justify-center gap-6 text-sm text-slate-600 sm:col-span-1 sm:flex">
              <li>병원 찾기</li>
              <li>검진 항목</li>
              <li>비용 비교</li>
              <li>이용 안내</li>
            </ul>
            <div className="justify-self-end">
              <button
                type="button"
                className="rounded-full bg-[#0c1425] px-4 py-1.5 text-xs font-semibold text-white"
              >
                검진예약
              </button>
            </div>
          </nav>

          <div className="flex flex-col items-center gap-4 text-center">
            <span className="w-fit rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              2026 국가건강검진 시즌
            </span>
            <div>
              <h1 className="break-keep text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                전국 건강검진 병원
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                지역별 검진병원 정보를 한눈에 비교하세요
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
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
                  {stat.label} {stat.value}
                </span>
              ))}
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
              selected={selectedTiers}
              onToggle={handleTierToggle}
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
          <section className="order-2 flex flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
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
                정렬 드롭다운 — 지금은 자리만 잡아둔 시각적 placeholder다.
                옵션이 "추천순" 하나뿐이라 골라도 목록 순서는 바뀌지 않는다.
                실제 정렬 기준·로직은 다음 작업에서 정해서 연결할 예정이다.
              */}
              <select
                aria-label="정렬 기준"
                defaultValue="recommended"
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
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

            {results.map((hospital, index) => (
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

          <div className="order-1 h-[320px] sm:h-[420px] lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100vh-8rem)]">
            <HospitalMap
              hospitals={mappableResults}
              selectedSido={isSearching ? null : selectedSido}
              searchActive={isSearching}
              selectedId={selectedHospitalId}
              onSelect={setSelectedHospitalId}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
