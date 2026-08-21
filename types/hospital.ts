/**
 * 시/도, 등급 값 체계의 단일 소스(Single Source of Truth).
 * 화면에 표시되는 전체 목록과 타입이 허용하는 값이 항상 일치하도록,
 * 배열을 먼저 선언하고 타입은 그 배열에서 파생시킨다.
 *
 * 행정구역 통합은 **법이 시행되어 확정된 것만** 반영한다(README "행정구역 개편 반영 원칙" 참고).
 * - 2026-07-01 시행: 광주광역시 + 전라남도 → "전남광주통합특별시"(약칭 "광주특별시").
 *   시/군/구는 그대로 유지되므로 region.sigungu는 손대지 않는다.
 * - 대구·경북(무산), 대전·충남(미확정)은 반영하지 않는다.
 */
export const SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "전남광주통합특별시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

export type Sido = (typeof SIDO_LIST)[number];

export const TIER_LIST = ["상급종합병원", "종합병원", "병원", "의원"] as const;

export type Tier = (typeof TIER_LIST)[number];

/**
 * 온라인 예약 페이지의 실제 성격.
 * - "자율예약": 달력에서 날짜·시간을 직접 골라 그 자리에서 예약이 확정된다.
 * - "예약신청": 이름·연락처만 남기면 상담원이 전화로 확정해 주는 콜백형.
 *   페이지 이름이 "온라인 예약"이어도 실제 동작이 이러면 이쪽으로 분류한다.
 */
export type BookingType = "자율예약" | "예약신청";

export interface Hospital {
  id: string;
  name: string;
  region: { sido: Sido; sigungu: string };
  tier: Tier;
  affiliation?: string;
  /** 동 단위까지 포함한 상세주소. 검색과 지오코딩 정확도를 위해 쓴다 */
  address?: string;
  reservationMethod: string;
  /** 검진센터 전용 번호 → 없으면 대표번호 → 그마저 없으면 "". 규칙은 README.md 참고 */
  phone: string;
  note?: string;
  /** 데이터 확인 시점의 출처 페이지 URL */
  sourceUrl: string;
  /** phone/reservationMethod/note를 확인한 날짜 (YYYY-MM-DD) */
  verifiedAt: string;
  /** 검진 가격대 (예: "기본형 20만원대~프리미엄 100만원대"). 확인 안 되면 생략 */
  priceRange?: string;
  /** 예약 대기 기간 (예: "성수기 기준 약 1~2개월"). 변동성이 커 대략적인 범위로만 기재 */
  waitingPeriod?: string;
  /** 주차/대중교통 접근성 정보 */
  accessInfo?: string;
  /** 검진 소요시간 */
  duration?: string;
  /** 결과 통보 방식 */
  resultNotice?: string;
  /** 검진 후 식사 제공 여부 (예: "제공(빵/우유 등 간단식)", "미제공") */
  mealProvided?: string;
  /**
   * 국가건강검진(공단 일반검진·암검진) 지정기관 여부.
   * 확인하지 못한 병원은 값을 넣지 않는다(undefined = 미확인).
   */
  nationalScreeningDesignated?: boolean;
  /** 온라인 예약 페이지 URL. 온라인 예약 경로가 없으면 비워둔다 */
  bookingUrl?: string;
  /** bookingUrl이 실제로 어떤 방식인지. 구분 기준은 BookingType 참고 */
  bookingType?: BookingType;
  /** 위도. scripts/geocode.mjs 로 Nominatim 조회 결과를 캐싱한 값 */
  lat?: number;
  /** 경도. scripts/geocode.mjs 로 Nominatim 조회 결과를 캐싱한 값 */
  lng?: number;
}

/** lat/lng 이 채워져 지도에 표시할 수 있는 병원 */
export type MappableHospital = Hospital & { lat: number; lng: number };

export function hasCoords(hospital: Hospital): hospital is MappableHospital {
  return typeof hospital.lat === "number" && typeof hospital.lng === "number";
}
