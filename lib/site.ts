/**
 * 커스텀 도메인 www.건강검진병원.com(퓨니코드: www.xn--939a1gjb379juyltje.com)이
 * 기본값이다. Vercel 프로젝트 환경변수 NEXT_PUBLIC_SITE_URL을 넣으면 그 값이 우선한다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--939a1gjb379juyltje.com";

export const SITE_NAME = "전국 건강검진 예약 비교";
export const SITE_DESCRIPTION =
  "전국 상급종합병원·종합병원의 건강검진 예약 방법, 등급, 국가검진 지정 여부를 지역별로 한눈에 비교합니다.";
