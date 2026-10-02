"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 메뉴. 지금은 세 항목 모두 실제 페이지가 있다("비용 비교"는 데이터가 부족해
 * 뺐고, "검진 항목"은 "검진 안내"(/checkup)로 바꿨다).
 *
 * 스타일 규칙(항목별로 자동 적용 — href만 채우면 된다):
 *  - href가 없는 항목: 글자만. 눌러도 아무 동작이 없는 순수 시각 요소다.
 *  - href가 있는 항목: 히어로 통계 배지("전국 병원 842")와 같은 흰 알약.
 *  - 지금 보고 있는 페이지(또는 그 하위 경로)의 항목: 파란 채움 + aria-current="page".
 *
 * 한 줄 메뉴라 PC·모바일이 같은 요소를 쓰고, 폭이 모자라면 줄바꿈한다.
 */
/** also: href 하위 경로 말고도 이 항목을 현재 페이지로 칠 경로 접두어 */
const MENU: { label: string; href?: string; also?: string[] }[] = [
  // 병원 상세(/hospital/[id])도 병원 찾기에 속한다
  { label: "병원 찾기", href: "/hospitals", also: ["/hospital/"] },
  { label: "검진 안내", href: "/checkup" },
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
          // 하위 경로(예: /hospitals/daegu)에서도 상위 메뉴를 현재 페이지로 표시한다.
          const current =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.also ?? []).some((prefix) => pathname.startsWith(prefix));
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
