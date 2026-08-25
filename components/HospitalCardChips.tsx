"use client";

import { useId, useState } from "react";
import { Hospital, Tier } from "@/types/hospital";
import { deriveChips, splitAccessInfo, ChipTone } from "@/lib/noteChips";

/**
 * 칩 클러스터형 카드 — **미리보기용 시안**이다.
 *
 * 기존 HospitalCard는 그대로 두고, app/page.tsx에서 특정 병원 하나에만
 * 이 컴포넌트를 대신 렌더링해 디자인을 비교한다(42번 항목).
 * 전체 적용이 결정되면 HospitalCard로 합치고 이 파일은 지운다.
 *
 * 기존 카드와 다른 점
 * - note 긴 문단 대신 핵심 사실을 칩으로 요약해 먼저 보여준다.
 * - 세부 근거(왜 이 번호인지, 주소 불일치 등)는 "자세히 보기" 뒤로 넘긴다.
 * - 확인일·출처는 아주 작은 글씨 한 줄로만 남긴다.
 */

const TIER_BADGE_STYLE: Record<Tier, string> = {
  상급종합병원: "bg-blue-100 text-blue-800",
  종합병원: "bg-teal-100 text-teal-800",
  병원: "bg-amber-100 text-amber-800",
  의원: "bg-slate-100 text-slate-800",
};

const CHIP_TONE_STYLE: Record<ChipTone, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  national: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
};

/**
 * 펼친 상태의 6개 항목. **순서 고정이고, 값이 없어도 행을 숨기지 않는다.**
 *
 * 값이 비어 있으면 `EMPTY_TEXT`("병원문의")를 흐린 글씨로 채운다. 행을 숨기면
 * 카드마다 표 구성이 달라져 비교가 어렵고, "정보가 없다"와 "항목 자체가 없다"를
 * 사용자가 구분할 수 없기 때문이다(45번 항목).
 *
 * 마지막 `reserved` 칸은 앞으로 항목이 늘어날 자리다. 빈 줄이 보이면 이상하므로
 * **렌더링하지 않는다**(아래 filter에서 걸러낸다). 새 항목을 넣을 때는 이 자리에
 * key·label·icon만 채우면 된다.
 */
type DetailRow = {
  key: string;
  label: string;
  icon: string;
  reserved?: boolean;
};

const EMPTY_TEXT = "병원문의";

const DETAIL_ROWS: DetailRow[] = [
  { key: "price", label: "검진비용", icon: "💰" },
  { key: "result", label: "결과통보", icon: "📄" },
  { key: "meal", label: "식사제공", icon: "🍚" },
  { key: "parking", label: "주차", icon: "🅿️" },
  { key: "transit", label: "대중교통", icon: "🚇" },
  { key: "address", label: "주소", icon: "📍" },
  { key: "reserved", label: "", icon: "", reserved: true },
];

interface Props {
  hospital: Hospital;
  selected?: boolean;
  onSelect?: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}

export default function HospitalCardChips({
  hospital,
  selected = false,
  onSelect,
  cardRef,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  const chips = deriveChips(hospital);
  const { parking, transit } = splitAccessInfo(hospital.accessInfo);

  const values: Record<string, string | undefined> = {
    price: hospital.priceRange,
    result: hospital.resultNotice,
    meal: hospital.mealProvided,
    parking,
    transit,
    address: hospital.address,
  };

  // 예비 칸만 걸러낸다. 6개 항목은 값이 없어도 항상 보여 준다(45번 항목).
  const rows = DETAIL_ROWS.filter((row) => !row.reserved);

  const nearbyFoodUrl = `https://map.kakao.com/?q=${encodeURIComponent(
    `${hospital.name} 맛집`
  )}`;

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={[
        "flex scroll-mt-4 flex-col gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors",
        onSelect ? "cursor-pointer" : "",
        selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-slate-200 hover:border-slate-300",
      ].join(" ")}
    >
      {/* 헤더: 병원명 + tier 배지 (기존 카드와 동일) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-base font-semibold leading-tight text-slate-900">
          {hospital.name}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            TIER_BADGE_STYLE[hospital.tier]
          }`}
        >
          {hospital.tier}
        </span>
      </div>

      {/* 지역 (기존 카드와 동일하되 전화번호는 아래 칩으로 옮겼다) */}
      <p className="text-sm leading-snug text-slate-500">
        {hospital.region.sido} {hospital.region.sigungu}
      </p>

      {/* 칩 클러스터 — 카드의 본체 */}
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li key={chip.label}>
            {chip.href ? (
              <a
                href={chip.href}
                onClick={(event) => event.stopPropagation()}
                className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium hover:brightness-95 ${
                  CHIP_TONE_STYLE[chip.tone]
                }`}
              >
                {chip.label}
              </a>
            ) : (
              <span
                className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${
                  CHIP_TONE_STYLE[chip.tone]
                }`}
              >
                {chip.label}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 확인일 + 출처만 아주 작게 */}
      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
        <span>확인일 {hospital.verifiedAt}</span>
        {hospital.sourceUrl && (
          <a
            href={hospital.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="hover:text-slate-600 hover:underline"
          >
            출처 보기 ↗
          </a>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={(event) => {
            // 카드 클릭(지도 이동)으로 전파되면 안 된다.
            event.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className="ml-auto rounded px-1 text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
        >
          {expanded ? "접기 ▴" : "자세히 보기 ▾"}
        </button>
      </div>

      {/* 상세: 기존 note 문단과 부가 필드를 그대로 유지한다 */}
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
            {/*
              6개 항목 표. 라벨 칸은 w-16 + whitespace-nowrap으로 고정해
              "결과통보"·"대중교통" 같은 4글자 라벨이 두 줄로 깨지지 않게 한다.
            */}
            <dl className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60">
              {rows.map((row) => {
                const value = values[row.key];
                const isEmpty = !value;
                return (
                  <div key={row.key} className="flex gap-2 px-3 py-1.5">
                    <dt className="flex w-16 shrink-0 items-start gap-1 whitespace-nowrap text-xs font-medium text-slate-500">
                      <span aria-hidden>{row.icon}</span>
                      {row.label}
                    </dt>
                    <dd
                      className={`text-xs leading-relaxed ${
                        isEmpty ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {value || EMPTY_TEXT}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {hospital.bookingUrl && (
              <a
                href={hospital.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
              >
                온라인 예약하기 ↗
              </a>
            )}

            {/* 표 아래: 확인일 / 출처 / 주변 맛집 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span>확인일 {hospital.verifiedAt}</span>
              {hospital.sourceUrl && (
                <a
                  href={hospital.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="hover:text-slate-600 hover:underline"
                >
                  출처 보기 ↗
                </a>
              )}
              <a
                href={nearbyFoodUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="hover:text-slate-600 hover:underline"
              >
                주변 맛집 보기 ↗
              </a>
            </div>

            {/*
              **이 카드는 note를 렌더링하지 않는다**(45번 항목).
              44번에서 note 문단 3개를 표로 바꾸면서 국가검진 근거 한 문단만
              "참고" 줄로 남겨 뒀는데, 흐린 글씨라 옛 note가 지워지지 않은 것처럼
              보였다. 지금은 hospital.note를 어디서도 읽지 않는다.
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
