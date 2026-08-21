"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SidoSelect from "@/components/SidoSelect";
import TierFilter from "@/components/TierFilter";
import HospitalCard from "@/components/HospitalCard";
import SearchBox from "@/components/SearchBox";
import { hasCoords, Sido, Tier } from "@/types/hospital";
import {
  filterHospitals,
  findUniqueSidoMatch,
  getSidosWithData,
  getTiersWithData,
} from "@/lib/hospitals";

// Leaflet은 window에 의존하므로 서버 렌더링에서 제외한다.
const HospitalMap = dynamic(() => import("@/components/HospitalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      지도를 불러오는 중…
    </div>
  ),
});

export default function Home() {
  const [selectedSido, setSelectedSido] = useState<Sido | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Set<Tier>>(new Set());
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 입력할 때마다 필터링하지 않도록 200ms 디바운스를 둔다.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = query.trim().length > 0;

  const sidosWithData = useMemo(() => getSidosWithData(), []);
  // 검색 중에는 지역 선택을 무시하므로 등급 목록도 전국 기준으로 계산한다.
  const tiersWithData = useMemo(
    () => getTiersWithData(isSearching ? null : selectedSido),
    [isSearching, selectedSido]
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

  // 검색어가 시/도 이름 하나로만 좁혀지면(예: "부산") 지역 선택으로 넘기고
  // 검색창을 비운다. 병원명 검색 등 지역으로 단정할 수 없는 검색어는 그대로 둔다.
  useEffect(() => {
    const matchedSido = findUniqueSidoMatch(query);
    if (!matchedSido) return;

    // 한글 IME로 "대전"을 치면 마지막 글자가 아직 조합(composition) 중이다.
    // 그 상태에서 값만 ""로 바꾸면 IME가 조합 버퍼의 글자를 다시 밀어넣어
    // 검색창에 글자가 그대로 남는다. blur로 조합을 먼저 확정시킨 뒤 비운다.
    // (blur가 발생시키는 input 이벤트의 onChange보다 아래 setSearchInput("")이
    //  나중에 반영되므로 최종 값은 빈 문자열이 된다.)
    const input = searchInputRef.current;
    const hadFocus = document.activeElement === input;
    input?.blur();

    setSelectedSido(matchedSido);
    setSelectedTiers(new Set());
    setSearchInput("");
    setQuery("");

    // 값이 비워진 뒤에 포커스를 돌려줘야 조합이 다시 붙지 않는다.
    // requestAnimationFrame은 프레임이 그려지지 않는 환경(비활성 탭 등)에서
    // 콜백이 돌지 않아 포커스가 영영 돌아오지 않는다(HospitalMap의 fadeAnimation과 같은 이유).
    // setTimeout은 그런 환경에서도 실행되므로 이쪽을 쓴다.
    if (hadFocus) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [query]);

  // 지도에서 마커를 고르면 해당 카드가 보이도록 스크롤한다.
  useEffect(() => {
    if (!selectedHospitalId) return;
    cardRefs.current[selectedHospitalId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedHospitalId]);

  function handleSidoChange(sido: Sido) {
    setSelectedSido(sido);
    setSelectedTiers(new Set());
    setSelectedHospitalId(null);
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            전국 건강검진 예약 비교
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            지도에서 병원을 찾아보거나, 지역과 등급으로 좁혀서 예약 정보를
            확인할 수 있습니다.
          </p>
        </div>
        <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              inputRef={searchInputRef}
            />
      </header>

      <section className="mb-6 flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <SidoSelect
          value={selectedSido}
          onChange={handleSidoChange}
          sidosWithData={sidosWithData}
        />
        <TierFilter
          selected={selectedTiers}
          onToggle={handleTierToggle}
          tiersWithData={tiersWithData}
        />
        {isSearching && (
          <p className="text-xs text-slate-500">
            검색 중에는 지역 선택을 무시하고 전국에서 찾습니다. 등급 필터는 함께
            적용됩니다.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* 모바일에서는 지도가 위, 데스크톱에서는 리스트가 왼쪽 */}
        <section className="order-2 flex flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">
              {isSearching ? `"${query.trim()}" 검색` : (selectedSido ?? "전국")}
            </span>{" "}
            병원 {results.length}곳
            {results.length > 0 && (
              <> · 지도 표시 {mappableResults.length}곳</>
            )}
          </p>

          {isSearching && results.length === 0 && (
            <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
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

          {results.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
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
    </main>
  );
}
