import { Sido } from "@/types/hospital";

export interface MapView {
  center: [number, number];
  zoom: number;
}

/** 지역을 선택하지 않은 최초 진입 상태에서 보여줄 전국 뷰 */
export const NATIONWIDE_VIEW: MapView = {
  center: [36.5, 127.8],
  zoom: 7,
};

/**
 * 시/도를 선택했는데 그 지역에 좌표가 등록된 병원이 아직 없을 때
 * 지도를 옮길 기준점. Record<Sido, ...> 라서 시/도가 늘어나면 컴파일 단계에서 걸린다.
 */
export const SIDO_VIEW: Record<Sido, MapView> = {
  서울특별시: { center: [37.5665, 126.978], zoom: 11 },
  부산광역시: { center: [35.1796, 129.0756], zoom: 11 },
  대구광역시: { center: [35.8714, 128.6014], zoom: 11 },
  인천광역시: { center: [37.4563, 126.7052], zoom: 11 },
  // 광주광역시 + 전라남도 통합(2026-07-01). 옛 광주 도심부터 남해안까지 한 화면에 들어오도록 잡는다.
  전남광주통합특별시: { center: [35.0, 126.93], zoom: 8 },
  대전광역시: { center: [36.3504, 127.3845], zoom: 11 },
  울산광역시: { center: [35.5384, 129.3114], zoom: 11 },
  세종특별자치시: { center: [36.48, 127.289], zoom: 11 },
  경기도: { center: [37.4138, 127.5183], zoom: 9 },
  강원특별자치도: { center: [37.8228, 128.1555], zoom: 8 },
  충청북도: { center: [36.8, 127.7], zoom: 9 },
  충청남도: { center: [36.5184, 126.8], zoom: 9 },
  전북특별자치도: { center: [35.7175, 127.153], zoom: 9 },
  경상북도: { center: [36.4919, 128.8889], zoom: 8 },
  경상남도: { center: [35.4606, 128.2132], zoom: 9 },
  제주특별자치도: { center: [33.4996, 126.5312], zoom: 10 },
};
