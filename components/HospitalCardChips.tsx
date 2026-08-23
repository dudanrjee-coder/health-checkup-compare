"use client";

import { useId, useState } from "react";
import { Hospital, Tier } from "@/types/hospital";
import { deriveChips, splitNoteParagraphs, ChipTone } from "@/lib/noteChips";

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

const DETAIL_FIELDS: { key: keyof Hospital; label: string }[] = [
  { key: "affiliation", label: "소속" },
  { key: "priceRange", label: "가격대" },
  { key: "waitingPeriod", label: "예약 대기" },
  { key: "resultNotice", label: "결과 통보" },
  { key: "accessInfo", label: "접근성" },
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
  const paragraphs = splitNoteParagraphs(hospital.note);
  // 칩으로 이미 요약한 항목은 상세에서 빼지 않는다 — 칩은 결론, 문단은 근거다.
  const details = DETAIL_FIELDS.filter(({ key }) => hospital[key]);

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
            <p className="text-xs leading-snug text-slate-600">
              <span className="font-medium text-slate-500">예약 </span>
              {hospital.reservationMethod}
            </p>

            {details.length > 0 && (
              <dl className="flex flex-col gap-1 text-xs text-slate-600">
                {details.map(({ key, label }) => (
                  <div key={key} className="flex gap-2">
                    <dt className="shrink-0 font-medium text-slate-500">
                      {label}
                    </dt>
                    <dd>{String(hospital[key])}</dd>
                  </div>
                ))}
              </dl>
            )}

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

            {/* note는 41번 항목의 문단 구분을 그대로 살려 문단별로 렌더링한다 */}
            {paragraphs.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2">
                {paragraphs.map((p) => (
                  <p
                    key={p.text.slice(0, 24)}
                    className="text-sm leading-relaxed text-slate-600"
                  >
                    {p.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
