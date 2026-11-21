import Link from "next/link";
import { Fragment } from "react";

/**
 * 모든 페이지 맨 아래 운영 안내 줄. app/layout.tsx가 {children} 뒤에 한 번 넣는다.
 *
 * 예전에는 홈(app/page.tsx)에만 있어서 나머지 페이지에서는 사이트 소개·
 * 개인정보처리방침·문의로 가는 링크가 없었다(2026-11-21 점검). 홈의 하단은
 * 지우고 여기로 옮겼으므로 홈에서도 한 번만 나온다.
 */
const FOOTER_LINKS = [
  { label: "사이트 소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "문의", href: "/contact" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 pb-8 pt-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
        <nav
          aria-label="운영 안내"
          className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-slate-600"
        >
          {FOOTER_LINKS.map((link, i) => (
            <Fragment key={link.href}>
              {i > 0 && (
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="rounded px-1.5 py-1 hover:text-slate-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {link.label}
              </Link>
            </Fragment>
          ))}
        </nav>
        <p className="m-0 break-keep text-xs leading-relaxed text-slate-500">
          검진 비용과 운영 방식은 병원 사정에 따라 바뀔 수 있으니, 예약 전에 병원에 직접
          확인해 주세요.
        </p>
      </div>
    </footer>
  );
}
