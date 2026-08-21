import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "전국 건강검진 예약 비교",
  description: "지역과 등급으로 병원별 건강검진 예약 정보를 비교합니다.",
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
