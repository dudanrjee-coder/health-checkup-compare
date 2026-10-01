"use client";

import { useEffect, useRef, useState } from "react";
import { Tier } from "@/types/hospital";
import { TIER_COLORS, tierBadgeStyle } from "@/lib/tierColors";
import { CONTACT_EMAIL, useCopyEmail } from "@/lib/useCopyEmail";

/**
 * 이용 안내(/guide) 페이지의 움직이는 실연 부분. **본문 글은 서버 컴포넌트에
 * 있고, 여기에는 움직이는 조각만 둔다.**
 *
 * 공통 규칙 — 모든 실연은 **서버 렌더링 결과가 "완성 상태"다.** 마운트 뒤
 * prefers-reduced-motion이 아닐 때만 처음부터 움직이기 시작한다. 그래서
 *  - JS가 꺼져 있어도 완성된 화면과 글이 보이고,
 *  - reduced-motion이면 아무것도 움직이지 않은 채 완성 상태로 남는다.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/* ───────────────────────── 검색 타이핑 ───────────────────────── */

export interface SearchDemoRow {
  tier: Tier;
  /** 짧은 등급 표기(예: 상급종합) */
  tierShort: string;
  name: string;
  /** 오른쪽 작은 지역 표기(예: 인천 남동구) */
  region: string;
}

const SEARCH_WORDS = ["서울", "남동구", "길병원"];
/** 완성 상태(서버 렌더링·reduced-motion)에서 보여 줄 검색어 */
const SEARCH_FINAL = "서울";

export function SearchDemo({ rows }: { rows: SearchDemoRow[] }) {
  const [typed, setTyped] = useState(SEARCH_FINAL);
  const [query, setQuery] = useState(SEARCH_FINAL);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers: number[] = [];
    let interval: number | undefined;
    let wi = 0;
    let alive = true;

    const cycle = () => {
      if (!alive) return;
      const word = SEARCH_WORDS[wi % SEARCH_WORDS.length];
      let i = 0;
      setTyped("");
      setQuery("");
      interval = window.setInterval(() => {
        i += 1;
        setTyped(word.slice(0, i));
        if (i >= word.length) {
          window.clearInterval(interval);
          timers.push(window.setTimeout(() => setQuery(word), 250));
          timers.push(
            window.setTimeout(() => {
              wi += 1;
              cycle();
            }, 2600)
          );
        }
      }, 260);
    };
    cycle();

    return () => {
      alive = false;
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const hit = (r: SearchDemoRow) =>
    !query || r.region.includes(query) || r.name.includes(query);

  return (
    <div aria-hidden="true">
      <div className="flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-blue-600 bg-white px-3.5 text-[15px]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 text-slate-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span>{typed}</span>
        <span className="guide-caret ml-px inline-block h-[18px] w-0.5 bg-blue-600 align-middle" />
      </div>
      <div className="mt-3 flex min-h-[116px] flex-col gap-2">
        {rows.map((r) => {
          const shown = hit(r);
          return (
            <div
              key={r.name}
              className={`flex items-center gap-2.5 overflow-hidden rounded-[10px] border border-slate-200 text-sm transition-all duration-300 motion-reduce:transition-none ${
                shown
                  ? "px-3 py-2.5 opacity-100"
                  : "-mt-2 h-0 border-0 px-3 py-0 opacity-0"
              }`}
            >
              <span
                className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={tierBadgeStyle(r.tier)}
              >
                {r.tierShort}
              </span>
              {r.name}
              <small className="ml-auto whitespace-nowrap text-xs text-slate-500">
                {r.region}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 등급 필터 + 지도 점 ───────────────────────── */

const FILTERS: { key: "all" | Tier; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "상급종합병원", label: "상급종합병원" },
  { key: "종합병원", label: "종합병원" },
  { key: "병원", label: "병원" },
  { key: "의료원", label: "의료원" },
];

/** 예시 지도의 점 위치(%)와 등급. 실제 병원 좌표가 아니라 그림용이다. */
const DOTS: [number, number, Tier][] = [
  [22, 18, "상급종합병원"], [30, 24, "상급종합병원"], [26, 30, "종합병원"],
  [35, 20, "병원"], [40, 28, "병원"], [28, 40, "종합병원"], [45, 45, "의료원"],
  [52, 22, "의료원"], [60, 35, "병원"], [65, 55, "종합병원"], [72, 60, "상급종합병원"],
  [78, 70, "병원"], [55, 62, "병원"], [48, 70, "종합병원"], [38, 62, "병원"],
  [30, 72, "의료원"], [42, 82, "병원"], [58, 80, "종합병원"], [70, 82, "상급종합병원"],
  [80, 50, "병원"], [68, 25, "의료원"], [20, 52, "병원"], [34, 50, "상급종합병원"],
  [62, 46, "종합병원"], [50, 55, "병원"], [24, 62, "종합병원"],
];

export function FilterMapDemo() {
  const [active, setActive] = useState<"all" | Tier>("all");
  const autoRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let i = 0;
    autoRef.current = window.setInterval(() => {
      i = (i + 1) % FILTERS.length;
      setActive(FILTERS[i].key);
    }, 2400);
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
    };
  }, []);

  const pick = (key: "all" | Tier) => {
    // 직접 누르면 자동 순환을 멈춘다(실제 홈 화면과 같은 동작).
    if (autoRef.current) {
      window.clearInterval(autoRef.current);
      autoRef.current = null;
    }
    setActive(key);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="등급 필터 예시">
        {FILTERS.map((f) => {
          const on = active === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => pick(f.key)}
              className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] transition-colors duration-300 motion-reduce:transition-none ${
                on
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-transparent text-slate-900 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="relative mt-3.5 h-[220px] overflow-hidden rounded-[14px] bg-gradient-to-br from-emerald-50 to-blue-50"
      >
        {DOTS.map(([x, y, tier], i) => {
          const dim = active !== "all" && active !== tier;
          return (
            <i
              key={i}
              className="absolute h-3 w-3 transition-all duration-500 motion-reduce:transition-none"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: TIER_COLORS[tier].marker,
                borderRadius: "50% 50% 50% 0",
                opacity: dim ? 0.12 : 1,
                transform: `rotate(-45deg) scale(${dim ? 0.7 : 1})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 카드 펼침 ───────────────────────── */

export interface CardDemoChip {
  label: string;
  /** reservation: 파란 채움 / national-green: 초록 / national-amber: 주황 / info: 점선 */
  style: "reservation" | "national-green" | "national-amber" | "info";
}

export interface CardDemoProps {
  name: string;
  tier: Tier;
  region: string;
  chips: CardDemoChip[];
  rows: { label: string; value: string }[];
}

const CHIP_CLASS: Record<CardDemoChip["style"], string> = {
  reservation: "border border-blue-600 bg-blue-600 text-white",
  "national-green": "border border-emerald-200 bg-emerald-100 text-emerald-800",
  "national-amber": "border border-amber-200 bg-amber-100 text-amber-800",
  info: "border border-dashed border-slate-300 bg-transparent text-slate-600",
};

export function CardDemo({ name, tier, region, chips, rows }: CardDemoProps) {
  // 완성 상태는 펼친 상태다(서버 렌더링·reduced-motion).
  const [open, setOpen] = useState(true);
  const autoRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setOpen(false);
    autoRef.current = window.setInterval(() => setOpen((o) => !o), 3200);
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
    };
  }, []);

  const toggle = () => {
    if (autoRef.current) {
      window.clearInterval(autoRef.current);
      autoRef.current = null;
    }
    setOpen((o) => !o);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-slate-200 p-4">
      <h3 className="m-0 flex flex-wrap items-center gap-2 text-[17px] font-semibold">
        {name}
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={tierBadgeStyle(tier)}
        >
          {tier}
        </span>
      </h3>
      <div className="text-sm text-slate-500">{region}</div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {chips.map((c) => (
          <span key={c.label} className={`rounded-full px-2.5 py-1 font-medium ${CHIP_CLASS[c.style]}`}>
            {c.label}
          </span>
        ))}
      </div>
      <div className="flex justify-end gap-4 text-[13px]">
        <span className="py-2 font-bold text-blue-600">상세 페이지 ›</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="px-0.5 py-2 text-slate-500 hover:text-slate-700"
        >
          {open ? "접기 ▴" : "자세히 보기 ▾"}
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <dl className="grid grid-cols-[auto_1fr] overflow-hidden rounded-[10px] border border-slate-200 text-[13px]">
            {rows.map((r, i) => {
              const last = i === rows.length - 1;
              const line = last ? "" : "border-b border-slate-200";
              return (
                <div key={r.label} className="contents">
                  <dt className={`whitespace-nowrap px-3 py-2 text-slate-500 ${line}`}>{r.label}</dt>
                  <dd className={`m-0 px-3 py-2 ${line}`}>{r.value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 수집 단계 진행 ───────────────────────── */

export interface Step {
  title: string;
  body: string;
}

export function StepsDemo({ steps }: { steps: Step[] }) {
  // 완성 상태는 마지막 단계까지 켜진 상태다.
  const [current, setCurrent] = useState(steps.length - 1);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // -1은 "전부 꺼짐"(한 바퀴 끝난 뒤 잠깐 비우는 구간)이다.
    let i = 0;
    setCurrent(0);
    const t = window.setInterval(() => {
      i = (i + 1) % (steps.length + 1);
      setCurrent(i === steps.length ? -1 : i);
    }, 1500);
    return () => window.clearInterval(t);
  }, [steps.length]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {steps.map((s, i) => {
          const on = i <= current;
          return (
            <div
              key={s.title}
              className={`flex flex-col gap-1.5 rounded-[14px] border-[1.5px] bg-white p-3.5 transition-all duration-300 motion-reduce:transition-none ${
                on ? "border-blue-600 shadow-[0_0_0_4px_#eff6ff]" : "border-slate-200"
              }`}
            >
              <span className={`text-[13px] font-extrabold ${on ? "text-blue-600" : "text-slate-500"}`}>
                {i + 1}단계
              </span>
              <b className="text-sm leading-snug">{s.title}</b>
              <span className="text-[12.5px] leading-relaxed text-slate-500">{s.body}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-[3px] overflow-hidden rounded-sm bg-slate-200" aria-hidden="true">
        <i
          className="block h-full bg-blue-600 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── 스크롤 등장 ───────────────────────── */

/**
 * `data-reveal`이 붙은 섹션 중 **첫 화면 밖에 있는 것만** 숨겼다가 보이면
 * 나타나게 한다. 숨김 클래스는 이 컴포넌트가 마운트된 뒤에야 붙으므로 JS가
 * 꺼져 있으면 처음부터 보인다. reduced-motion이면 아무것도 하지 않는다.
 */
export function GuideReveal() {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const reveal = (el: Element) => {
      el.classList.add("guide-show");
      el.classList.remove("guide-pre");
      io.unobserve(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) reveal(e.target);
        // 목차 링크·빠른 스크롤로 한 번에 건너뛴 섹션은 화면과 겹친 적이 없어
        // 관찰 콜백이 오지 않는다(아래에서 위로 바로 넘어감). 그대로 두면 영영
        // 숨은 채 남으므로, 이미 화면 위쪽으로 지나간 섹션도 함께 보이게 한다.
        document.querySelectorAll(".guide-pre").forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight) reveal(el);
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("guide-pre");
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);
  return null;
}

/* ───────────────────────── 이메일 복사 ───────────────────────── */

/** 홈 화면과 같은 복사 로직(lib/useCopyEmail.ts)을 쓴다. */
export function CopyEmail() {
  const { copied, copy } = useCopyEmail();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <code className="select-all rounded-[10px] border border-slate-200 bg-white px-3 py-2 font-sans text-[15px]">
        {CONTACT_EMAIL}
      </code>
      <button
        type="button"
        onClick={copy}
        className="h-11 rounded-[10px] bg-slate-900 px-4 font-bold text-white hover:bg-slate-800"
      >
        주소 복사
      </button>
      <span
        className={`text-xs text-emerald-600 transition-opacity ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        복사됨
      </span>
    </div>
  );
}
