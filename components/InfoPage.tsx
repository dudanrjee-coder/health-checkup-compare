import type { ReactNode } from "react";
import HomeBreadcrumb from "@/components/HomeBreadcrumb";
import SiteNav from "@/components/SiteNav";

/**
 * 사이트 소개·개인정보처리방침·문의처럼 글만 있는 운영 안내 페이지의 공통 틀.
 * 다른 하위 페이지와 같은 순서(상단 메뉴 → "‹ 홈으로" 위치 표시 → 제목 카드 → 본문)로
 * 그리고, 본문은 한 줄 65자 안팎으로 좁혀 읽기 편하게 한다.
 */
export default function InfoPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden break-keep bg-slate-50 px-4 pb-16 text-base leading-[1.75] text-slate-900">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 pt-5">
        <SiteNav />

        <HomeBreadcrumb trail={[{ label: title }]} />

        <header className="flex flex-col gap-2.5 rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-100 via-white to-pink-100 px-6 py-7">
          <h1 className="m-0 text-[clamp(26px,5vw,38px)] font-extrabold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="m-0 max-w-[60ch] text-slate-600">{subtitle}</p>
        </header>

        <article className="flex max-w-[65ch] flex-col gap-9 pt-4">{children}</article>
      </div>
    </main>
  );
}

/** 소제목 + 문단 한 묶음 */
export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">{heading}</h2>
      {children}
    </section>
  );
}

/** 본문 문단·목록에 같이 쓰는 클래스 */
export const INFO_P = "m-0 text-slate-700";
export const INFO_LIST = "m-0 flex list-disc flex-col gap-1.5 pl-5 text-slate-700";
/** 맨 아래 작은 글씨 */
export const INFO_FINE = "m-0 border-t border-slate-200 pt-5 text-[13px] text-slate-500";
