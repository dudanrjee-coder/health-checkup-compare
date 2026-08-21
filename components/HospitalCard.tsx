"use client";

import { useId, useState } from "react";
import { Hospital, Tier } from "@/types/hospital";

const TIER_BADGE_STYLE: Record<Tier, string> = {
  상급종합병원: "bg-blue-100 text-blue-800",
  종합병원: "bg-teal-100 text-teal-800",
  병원: "bg-amber-100 text-amber-800",
  의원: "bg-slate-100 text-slate-800",
};

const BADGE_BASE = "rounded-full px-2 py-0.5 text-[11px] font-medium";

const DETAIL_FIELDS: { key: keyof Hospital; label: string }[] = [
  { key: "affiliation", label: "소속" },
  { key: "priceRange", label: "가격대" },
  { key: "duration", label: "소요시간" },
  { key: "waitingPeriod", label: "예약 대기" },
  { key: "resultNotice", label: "결과 통보" },
  { key: "mealProvided", label: "식사 제공" },
  { key: "accessInfo", label: "접근성" },
];

interface HospitalCardProps {
  hospital: Hospital;
  /** 지도에서 선택된 병원이면 카드도 강조한다 */
  selected?: boolean;
  onSelect?: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}

export default function HospitalCard({
  hospital,
  selected = false,
  onSelect,
  cardRef,
}: HospitalCardProps) {
  // 34곳 모두 상세 필드가 채워지면서 카드가 길어져, 기본은 접어 두고 펼쳐서 본다.
  // 펼침 상태는 카드마다 따로 들고 있으므로 한 카드를 펼쳐도 다른 카드는 그대로다.
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  // 값이 빈 필드는 펼친 상태에서도 계속 숨긴다.
  const details = DETAIL_FIELDS.filter(({ key }) => hospital[key]);
  const nearbyFoodUrl = `https://map.kakao.com/?q=${encodeURIComponent(
    `${hospital.name} 맛집`
  )}`;

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={[
        "flex scroll-mt-4 flex-col gap-1.5 rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors",
        onSelect ? "cursor-pointer" : "",
        selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-slate-200 hover:border-slate-300",
      ].join(" ")}
    >
      {/* 1줄: 병원명과 배지를 같은 줄에 붙인다. 좁으면 배지만 아랫줄로 넘어간다. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-base font-semibold leading-tight text-slate-900">
          {hospital.name}
        </h3>
        <span className={`${BADGE_BASE} ${TIER_BADGE_STYLE[hospital.tier]}`}>
          {hospital.tier}
        </span>
        {/* undefined(미확인)와 false(명단 확인 결과 미지정)를 구분해서 보여준다 */}
        {hospital.nationalScreeningDesignated === true && (
          <span className={`${BADGE_BASE} bg-emerald-100 text-emerald-800`}>
            국가검진 지정기관
          </span>
        )}
        {hospital.nationalScreeningDesignated === false && (
          <span className={`${BADGE_BASE} bg-amber-100 text-amber-800`}>
            국가검진 미지정
          </span>
        )}
      </div>

      {/* 2줄: 지역과 전화번호를 한 줄에 묶는다. */}
      <p className="text-sm leading-snug text-slate-500">
        {hospital.region.sido} {hospital.region.sigungu}
        {" · "}
        {hospital.phone ? (
          <a
            href={`tel:${hospital.phone}`}
            className="text-blue-600 hover:underline"
          >
            {hospital.phone}
          </a>
        ) : (
          <span className="text-rose-600">전화 확인 필요</span>
        )}
      </p>

      {/*
        3줄: 예약 방식 요약. 접힌 동안에는 truncate로 반드시 한 줄로 자른다.
        (dd를 inline으로 두고 line-clamp를 걸면 클램프가 적용되지 않아 여러 줄로 늘어난다)
      */}
      <p
        className={`text-xs leading-snug text-slate-600 ${
          expanded ? "" : "truncate"
        }`}
      >
        <span className="font-medium text-slate-500">예약 </span>
        {hospital.reservationMethod}
      </p>

      {/*
        grid-rows 0fr→1fr 트랜지션. 내용 높이를 미리 재지 않아도 되고,
        접힌 동안에는 overflow-hidden으로 안쪽이 완전히 가려진다.
      */}
      <div
        id={detailId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {/*
            접힌 동안에는 안쪽 링크·버튼이 키보드 탭 순서에서 빠져야 한다.
            overflow-hidden만으로는 포커스가 들어갈 수 있어 visibility를 함께 쓴다.
            (React 18은 boolean inert 속성을 그대로 넘기지 못해 쓰지 않는다.)
            접을 때는 높이 애니메이션이 끝나는 시점에 맞춰 지연시켜야 내용이
            갑자기 사라지지 않는다. 펼칠 때는 지연 없이 바로 보인다.
          */}
          <div
            className={`flex flex-col gap-2 pt-2 transition-[visibility] ${
              expanded ? "visible delay-0" : "invisible delay-300"
            }`}
          >
            {details.length > 0 && (
              <dl className="grid grid-cols-1 gap-1.5 border-t border-slate-100 pt-2 text-sm text-slate-700 sm:grid-cols-2">
                {details.map(({ key, label }) => (
                  <div key={key}>
                    <dt className="inline font-medium text-slate-500">
                      {label}:{" "}
                    </dt>
                    <dd className="inline">{hospital[key] as string}</dd>
                  </div>
                ))}
              </dl>
            )}

            {hospital.bookingUrl && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={hospital.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  온라인 예약하기 ↗
                </a>
                {hospital.bookingType === "예약신청" && (
                  <span className="text-xs text-slate-500">(상담원 콜백)</span>
                )}
              </div>
            )}

            {hospital.note && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {hospital.note}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a
                  href={hospital.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  출처 바로가기 ↗
                </a>
                <a
                  href={nearbyFoodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  주변 맛집 보기 ↗
                </a>
              </div>
              <span className="text-xs text-slate-400">
                확인일 {hospital.verifiedAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 줄이 따로 높이를 먹지 않도록, 카드 아래 여백 안쪽으로 당겨 붙인다. */}
      <div className="-mb-1 flex justify-end">
        <button
          type="button"
          // 카드 전체의 onSelect(지도 이동)까지 함께 발생하지 않도록 전파를 끊는다.
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="-mr-1 rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          {expanded ? "닫기 ▴" : "펼쳐보기 ▾"}
        </button>
      </div>
    </div>
  );
}
