"use client";

import { useId, useState } from "react";
import { Hospital } from "@/types/hospital";
import { Chip, deriveChips, splitAccessInfo } from "@/lib/noteChips";
import { tierBadgeStyle } from "@/lib/tierColors";

/**
 * 칩 클러스터형 카드 — **미리보기용 시안**이다(46번 항목이 최종 사양).
 *
 * 기존 HospitalCard는 그대로 두고, app/page.tsx의 CHIP_PREVIEW_IDS에 든 병원만
 * 이 컴포넌트로 렌더링해 디자인을 비교한다. 전체 적용이 결정되면 HospitalCard로
 * 합치고 이 파일과 스위치를 지운다.
 *
 * **이 카드는 hospital.note를 렌더링하지 않는다.** 요약은 칩, 상세는 6줄 표다.
 */

const CHIP_BASE =
  "inline-block rounded-full px-2.5 py-1 text-xs font-medium transition-colors";

/** 칩 종류별 스타일. 예약(채움) / 정보(점선·투명) / 국가검진(채움)이 한눈에 갈린다. */
function chipClass(chip: Chip): string {
  if (chip.kind === "reservation") {
    // 헤더의 파란 배지·번호 배지와 같은 색으로 맞춰, "실행 가능한 행동"이라는
    // 뜻을 페이지 전체에서 하나의 색으로 통일했다.
    return chip.active
      ? `${CHIP_BASE} border border-blue-600 bg-blue-600 text-white hover:bg-blue-700`
      : `${CHIP_BASE} cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400`;
  }
  if (chip.kind === "national") {
    return chip.tone === "green"
      ? `${CHIP_BASE} border border-emerald-200 bg-emerald-100 text-emerald-800`
      : `${CHIP_BASE} border border-amber-200 bg-amber-100 text-amber-800`;
  }
  // info — 채워지지 않은 점선 알약
  return `${CHIP_BASE} border border-dashed border-slate-300 bg-transparent text-slate-600`;
}

/**
 * 펼친 상태의 6줄. **순서 고정이고 값이 없어도 숨기지 않는다.**
 *
 * 행을 숨기면 카드마다 표 구성이 달라져 비교가 어렵고, "병원이 공개하지 않았다"와
 * "항목 자체가 없다"를 사용자가 구분할 수 없다. 빈 값은 흐린 "병원문의"로 채운다.
 *
 * 마지막 `예비` 행은 앞으로 항목이 늘어날 자리다. 흐린 이탤릭으로 자리만 지키며,
 * 실제 항목이 정해지면 key·label·icon을 채우고 값을 연결하면 된다.
 */
type DetailRow = { key: string; label: string; icon: string; reserved?: boolean };

const EMPTY_TEXT = "병원문의";

const DETAIL_ROWS: DetailRow[] = [
  { key: "price", label: "검진비용", icon: "💰" },
  { key: "result", label: "결과통보", icon: "📄" },
  { key: "meal", label: "식사제공", icon: "🍚" },
  { key: "access", label: "주차·교통", icon: "🚗" },
  { key: "address", label: "주소", icon: "📍" },
  { key: "reserved", label: "예비", icon: "➕", reserved: true },
];

interface Props {
  hospital: Hospital;
  /** 목록에서의 순서(0부터). 왼쪽 원형 번호 배지에 01, 02... 로 표시한다 */
  index: number;
  selected?: boolean;
  onSelect?: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}

export default function HospitalCardChips({
  hospital,
  index,
  selected = false,
  onSelect,
  cardRef,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  /** 국가검진 칩 툴팁. 호버로 열리고, 터치 환경을 위해 탭으로도 토글된다. */
  const [tipKey, setTipKey] = useState<string | null>(null);
  const detailId = useId();

  const chips = deriveChips(hospital);
  const { parking, transit } = splitAccessInfo(hospital.accessInfo);

  const values: Record<string, string | undefined> = {
    price: hospital.priceRange,
    result: hospital.resultNotice,
    meal: hospital.mealProvided,
    address: hospital.address,
  };

  const nearbyFoodUrl = `https://map.kakao.com/?q=${encodeURIComponent(
    `${hospital.name} 맛집`
  )}`;

  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const orderLabel = String(index + 1).padStart(2, "0");

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={[
        "flex scroll-mt-4 gap-3 rounded-2xl border bg-white p-5 shadow-lg shadow-slate-200/50 transition-colors sm:gap-4",
        onSelect ? "cursor-pointer" : "",
        selected
          ? "border-blue-400 ring-2 ring-blue-200"
          : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
    >
      {/* 왼쪽 원형 번호 배지. 목록 순서를 그대로 보여준다(정렬 순서가 곧 번호) */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {orderLabel}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* 헤더: 병원명·tier 배지·검진센터 바로가기(좌) / 검진비용(우) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold leading-tight text-slate-900">
              {hospital.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={tierBadgeStyle(hospital.tier)}
            >
              {hospital.tier}
            </span>
            {hospital.sourceUrl && (
              <a
                href={hospital.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800"
              >
                🔗 병원 바로가기(검진센터)
              </a>
            )}
          </div>

          {/* priceRange는 있는 그대로만 보여준다. 값이 없다고 숫자를 짐작해
              채우지 않고, "가격정보 없음"이라고 정직하게 표시한다. */}
          <div className="sm:max-w-[45%] sm:shrink-0 sm:text-right">
            {hospital.priceRange ? (
              <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold leading-snug text-blue-700">
                {hospital.priceRange}
              </span>
            ) : (
              <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
                가격정보 없음
              </span>
            )}
          </div>
        </div>

        <p className="text-sm leading-snug text-slate-500">
          {hospital.region.sido} {hospital.region.sigungu}
        </p>

        {/* 칩 클러스터 */}
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const className = chipClass(chip);
            const showTip = tipKey === chip.key;

            const inner =
              chip.href && chip.active !== false ? (
                <a
                  href={chip.href}
                  target={chip.href.startsWith("tel:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  onClick={stop}
                  className={className}
                >
                  {chip.label}
                </a>
              ) : (
                <span
                  className={className}
                  aria-disabled={chip.active === false || undefined}
                >
                  {chip.label}
                </span>
              );

            if (!chip.tooltip) return <li key={chip.key}>{inner}</li>;

            return (
              <li
                key={chip.key}
                className="relative"
                onMouseEnter={() => setTipKey(chip.key)}
                onMouseLeave={() => setTipKey(null)}
                onClick={(event) => {
                  // 카드 클릭(지도 이동)으로 번지지 않게 하고, 터치에서도 툴팁이 열리게 한다.
                  event.stopPropagation();
                  setTipKey((prev) => (prev === chip.key ? null : chip.key));
                }}
              >
                {inner}
                {showTip && (
                  <span
                    role="tooltip"
                    className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-white shadow"
                  >
                    {chip.tooltip}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* 접힌 상태에서는 펼치기 버튼만 둔다. 확인일·출처는 카드에 상시 노출하지 않는다. */}
        <div className="flex justify-end">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="rounded px-1 text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
          >
            {expanded ? "접기 ▴" : "자세히 보기 ▾"}
          </button>
        </div>

        <div
          id={detailId}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`flex flex-col gap-2 pt-1 transition-[visibility] ${
                expanded ? "visible" : "invisible delay-300"
              }`}
            >
              {/* 6줄 표. 라벨 칸은 w-20 + whitespace-nowrap으로 고정해 줄바꿈을 막는다. */}
              <dl className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60">
                {DETAIL_ROWS.map((row) => {
                  if (row.reserved) {
                    return (
                      <div key={row.key} className="flex gap-2 px-3 py-1.5">
                        <dt className="flex w-20 shrink-0 items-start gap-1 whitespace-nowrap text-xs font-medium italic text-slate-300">
                          <span aria-hidden>{row.icon}</span>
                          {row.label}
                        </dt>
                        <dd className="text-xs italic leading-relaxed text-slate-300">
                          추후 항목 추가 대비 여유 칸
                        </dd>
                      </div>
                    );
                  }

                  // 주차·교통은 한 줄에 두 가지를 담되, 나뉘면 줄을 갈라 읽기 쉽게 둔다.
                  if (row.key === "access") {
                    const hasAny = parking || transit;
                    return (
                      <div key={row.key} className="flex gap-2 px-3 py-1.5">
                        <dt className="flex w-20 shrink-0 items-start gap-1 whitespace-nowrap text-xs font-medium text-slate-500">
                          <span aria-hidden>{row.icon}</span>
                          {row.label}
                        </dt>
                        <dd
                          className={`flex flex-col gap-0.5 text-xs leading-relaxed ${
                            hasAny ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {!hasAny && EMPTY_TEXT}
                          {transit && (
                            <span>
                              <span className="text-slate-400">교통 </span>
                              {transit}
                            </span>
                          )}
                          {parking && (
                            <span>
                              <span className="text-slate-400">주차 </span>
                              {parking}
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  }

                  const value = values[row.key];
                  return (
                    <div key={row.key} className="flex gap-2 px-3 py-1.5">
                      <dt className="flex w-20 shrink-0 items-start gap-1 whitespace-nowrap text-xs font-medium text-slate-500">
                        <span aria-hidden>{row.icon}</span>
                        {row.label}
                      </dt>
                      <dd
                        className={`text-xs leading-relaxed ${
                          value ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {value || EMPTY_TEXT}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {/* 표 아래에는 주변 맛집만 남긴다(확인일·출처는 노출하지 않는다). */}
              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                <a
                  href={nearbyFoodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stop}
                  className="hover:text-slate-600 hover:underline"
                >
                  주변 맛집 보기 ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
