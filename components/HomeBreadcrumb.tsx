import Link from "next/link";
import { Fragment } from "react";

/**
 * 하위 페이지 상단의 위치 표시. 맨 앞은 "‹ 홈으로" 알약 버튼이고,
 * 뒤의 경로(› 병원 찾기 › 서울특별시 …)는 흐린 글자로 이어 붙인다.
 *
 * 상단 메뉴에서 로고 글자를 뺀 뒤로 홈으로 돌아가는 길이 이것뿐이라
 * 눌러지는 곳으로 보이게 버튼 모양으로 만들었다. 모든 하위 페이지가
 * 이 컴포넌트 하나를 써서 크기·간격이 똑같게 유지된다.
 *
 * trail: 홈 뒤에 붙는 경로. href가 없는 항목은 링크 없는 글자(현재 페이지 등).
 */
export default function HomeBreadcrumb({
  trail = [],
}: {
  trail?: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="현재 위치"
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-5 text-slate-500"
    >
      {/* 겉모양은 30px 남짓이지만 before로 위아래 터치 영역을 넓혀 44px을 확보한다 */}
      <Link
        href="/"
        className="relative inline-flex items-center gap-1 rounded-full bg-blue-50 py-1.5 pl-2.5 pr-3.5 font-bold text-[#2563eb] transition-colors before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 3.5 5.5 8l4.5 4.5" />
        </svg>
        홈으로
      </Link>
      {trail.map((item, i) => (
        <Fragment key={`${i}-${item.label}`}>
          <span aria-hidden="true" className="text-slate-300">
            ›
          </span>
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className={i === trail.length - 1 ? "text-slate-700" : undefined}>
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
