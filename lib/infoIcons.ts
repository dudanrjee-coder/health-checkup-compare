/**
 * 검진 정보 항목 아이콘(이모지). **홈 카드의 펼친 표(HospitalCardChips)와 병원
 * 상세 페이지의 검진 정보 표가 여기 하나만 본다.** 두 곳이 각자 하드코딩하면
 * 한쪽만 바뀌어 같은 항목의 아이콘이 화면마다 달라진다.
 *
 * 카드 컴포넌트 파일이 아니라 lib에 두는 이유: 카드는 "use client" 모듈이라
 * 서버 컴포넌트인 상세 페이지가 그 안의 상수를 값으로 가져올 수 없다.
 *
 * 아이콘은 장식이다. 렌더링하는 쪽에서 반드시 aria-hidden을 붙인다.
 */
export const INFO_ICONS = {
  price: "💰",
  result: "📄",
  meal: "🍚",
  /** 카드는 주차·교통을 한 줄로 묶어 이 아이콘을 쓴다 */
  access: "🚗",
  address: "📍",
  reserved: "➕",
  /** 아래는 상세 페이지에만 있는 항목 */
  duration: "⏱️",
  parking: "🅿️",
  transit: "🚌",
} as const;
