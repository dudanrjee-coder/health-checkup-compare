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
   * icon-192.png/icon-512.png는 여기 metadata.icons에 넣어도 favicon.ico
   * 파일 컨벤션이 우선 적용되며 통째로 무시되길래(렌더링해서 확인함)
   * app/manifest.ts 쪽으로 옮겼다 — PWA 매니페스트용 아이콘이라 그게
   * 맞는 자리이기도 하다.
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
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
