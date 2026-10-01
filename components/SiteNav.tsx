"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 메뉴. 시안에서 온 요소라 아직 페이지가 없는 항목이 섞여 있다.
 *
 * 스타일 규칙(항목별로 자동 적용 — href만 채우면 된다):
 *  - href가 없는 항목: 글자만. 눌러도 아무 동작이 없는 순수 시각 요소다.
 *  - href가 있는 항목: 히어로 통계 배지("전국 병원 842")와 같은 흰 알약.
 *  - 지금 보고 있는 페이지의 항목: 파란 채움 + aria-current="page".
 *
 * 한 줄 메뉴라 PC·모바일이 같은 요소를 쓰고, 폭이 모자라면 줄바꿈한다.
 */
const MENU: { label: string; href?: string }[] = [
  { label: "병원 찾기" },
  { label: "검진 항목" },
  { label: "비용 비교" },
  { label: "이용 안내", href: "/guide" },
];

/** 통계 배지와 같은 배경·모서리·패딩. 겉모양은 32px 남짓이지만 before로
 *  위아래 터치 영역을 넓혀 44px을 확보한다(레이아웃 높이는 그대로). */
const PILL =
  "relative inline-block rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition-colors " +
  "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const PILL_IDLE = "border-white/60 bg-white/70 text-slate-700 hover:bg-white/90 hover:text-slate-900";
const PILL_CURRENT = "border-blue-600 bg-[#2563eb] text-white hover:bg-blue-700";

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="flex items-center justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-600 sm:gap-x-6">
        {MENU.map((item) => {
          if (!item.href) return <li key={item.label}>{item.label}</li>;
          const current = pathname === item.href;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`${PILL} ${current ? PILL_CURRENT : PILL_IDLE}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
