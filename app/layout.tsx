import type { Metadata } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const KEYWORDS = [
  "건강검진",
  "건강검진 예약",
  "건강검진 병원",
  "종합병원 건강검진",
  "상급종합병원 건강검진",
  "국가건강검진",
  "지역별 건강검진 병원",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  alternates: {
    canonical: "/",
  },
  /**
   * favicon.ico·apple-icon.png는 app/ 폴더에 두면 Next.js App Router 파일
   * 컨벤션으로 자동 인식된다(원래 파일명은 apple-touch-icon.png였는데,
   * Next 컨벤션이 인식하는 이름은 apple-icon.png라 그 이름으로 바꿨다).
   * PWA 매니페스트 아이콘은 app/manifest.ts에서 apple-icon.png를 같이 쓴다.
   */
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // Vercel 프로젝트 환경변수에 값을 넣으면 자동으로 반영됨(값이 없으면 태그 자체가 생략됨)
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/*
          구글 애드센스 사이트 연결 코드. 광고 단위는 두지 않고 승인 후 자동 광고로 설정한다.
          next/script는 쓰지 않는다 — Next 14에서는 서버 HTML에 태그 없이 JS로 <body>에 넣고
          data-nscript 속성을 붙여 애드센스가 "AdSense head tag doesn't support data-nscript
          attribute" 경고를 낸다. 일반 <script>는 서버 HTML의 <head>에 그대로 들어간다.
        */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7557818401283330"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
