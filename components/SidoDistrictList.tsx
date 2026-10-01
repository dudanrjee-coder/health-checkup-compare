"use client";

import Link from "next/link";
import { useState } from "react";
import { Tier, TIER_LIST } from "@/types/hospital";
import { TIER_COLORS, tierBadgeStyle } from "@/lib/tierColors";

/**
 * 시·도 페이지(/hospitals/[sido])의 등급 필터 + 시·군·구별 접기 목록.
 * **움직이는 부분(필터·접기)만 클라이언트**이고, 목록 자체는 서버 렌더링 HTML에
 * 그대로 들어간다(병원 이름·링크가 검색엔진에 보인다).
 *
 * 접기는 네이티브 <details>라 JS가 없어도 동작한다. 열림 상태를 React state로도
 * 들고 있는 이유는, 필터를 바꿔 다시 렌더링할 때 사용자가 직접 열고 닫은 상태가
 * 초기값(처음 3개 펼침)으로 되돌아가지 않게 하기 위해서다.
 */

export interface DistrictItem {
  id: string;
  name: string;
  tier: Tier;
  designated: boolean;
  href: string;
}

export interface DistrictData {
  sigungu: string;
  hospitals: DistrictItem[];
}

const SHORT: Record<Tier, string> = {
  상급종합병원: "상급종합",
  종합병원: "종합병원",
  병원: "병원",
  의료원: "의료원",
};

/** 처음에 펼쳐 둘 시·군·구 수(병원 많은 순 상위) */
const INITIAL_OPEN = 3;

export default function SidoDistrictList({
  districts,
  mapHref,
  mapLabel,
}: {
  districts: DistrictData[];
  /** 없으면 지도 링크를 숨긴다 */
  mapHref?: string;
  mapLabel?: string;
}) {
  const [tier, setTier] = useState<Tier | "all">("all");
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(districts.slice(0, INITIAL_OPEN).map((d) => d.sigungu))
  );

  const visible = (h: DistrictItem) => tier === "all" || h.tier === tier;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="등급으로 거르기">
          {(["all", ...TIER_LIST] as const).map((t) => {
            const on = tier === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTier(t)}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-[13px] transition-colors ${
                  on
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
              >
                {t === "all" ? "전체" : SHORT[t]}
              </button>
            );
          })}
        </div>
        {mapHref && (
          <Link
            href={mapHref}
            className="px-0.5 py-1.5 text-[13px] font-bold text-blue-600 hover:underline"
          >
            {mapLabel}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {districts.map((d) => {
          const shown = d.hospitals.filter(visible);
          const isOpen = open.has(d.sigungu);
          return (
            <details
              key={d.sigungu}
              open={isOpen}
              hidden={shown.length === 0}
              onToggle={(e) => {
                const now = e.currentTarget.open;
                setOpen((prev) => {
                  if (prev.has(d.sigungu) === now) return prev;
                  const next = new Set(prev);
                  if (now) next.add(d.sigungu);
                  else next.delete(d.sigungu);
                  return next;
                });
              }}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2.5 px-4 py-3.5 text-base font-bold [&::-webkit-details-marker]:hidden">
                <span>
                  {d.sigungu}{" "}
                  <span className="text-[13px] font-medium tabular-nums text-slate-500">
                    {`${shown.length}곳`}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                >
                  ▾
                </span>
              </summary>
              <ul className="m-0 list-none border-t border-slate-200 p-0">
                {d.hospitals.map((h) => (
                  <li key={h.id} hidden={!visible(h)} className="border-b border-slate-200 last:border-b-0">
                    <Link
                      href={h.href}
                      className="flex min-h-[52px] items-center gap-2.5 px-4 py-2 hover:bg-slate-50"
                    >
                      <i
                        aria-hidden="true"
                        className="inline-block h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{ background: TIER_COLORS[h.tier].marker }}
                      />
                      <span className="min-w-0 font-medium">{h.name}</span>
                      <span className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                        <span
                          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={tierBadgeStyle(h.tier)}
                        >
                          {SHORT[h.tier]}
                        </span>
                        {h.designated && (
                          // 좁은 화면에서는 시안처럼 지정 표시를 숨겨 이름 칸을 지킨다.
                          <span className="hidden whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 min-[561px]:inline">
                            국가검진 지정
                          </span>
                        )}
                        <span aria-hidden="true" className="text-slate-400">
                          ›
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </>
  );
}
