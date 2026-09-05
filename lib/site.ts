/**
 * 실제 도메인이 정해지면 Vercel 프로젝트 환경변수 NEXT_PUBLIC_SITE_URL을
 * 그 값으로 설정한다(예: https://건강검진병원.net). 설정 전까지는 임시로
 * Vercel 기본 도메인을 쓴다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://health-checkup-compare.vercel.app";

export const SITE_NAME = "전국 건강검진 예약 비교";
export const SITE_DESCRIPTION =
  "전국 16개 시/도 상급종합병원·종합병원 153곳의 건강검진 예약 방법, 등급, 국가검진 지정 여부를 지역별로 한눈에 비교합니다.";
