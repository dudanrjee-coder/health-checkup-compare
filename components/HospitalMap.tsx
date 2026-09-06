"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MappableHospital, Sido, Tier } from "@/types/hospital";
import { TIER_COLORS } from "@/lib/tierColors";
import { NATIONWIDE_VIEW, SIDO_VIEW } from "@/lib/regions";
import { useHoverCapable } from "@/lib/useHoverCapable";

/** 선택한 병원으로 이동하는 애니메이션 길이(초) */
const FLY_DURATION_SEC = 0.6;

/** 선택된 마커의 테두리색. 채움은 tier가 정하므로 선택 표시는 테두리로 한다. */
const SELECTED_STROKE = "#2563eb";

/**
 * 번들러 환경에서 Leaflet 기본 마커 이미지 경로가 깨지므로 divIcon(인라인 SVG)을 쓴다.
 *
 * **채움색은 tier가 정한다**(`TIER_COLORS` — 카드 배지와 같은 값을 본다).
 * 예전에는 채움색이 선택 여부를 나타냈지만, 이제 그 자리를 tier가 쓰므로
 * 선택 표시는 **크기(비선택보다 크게) + 파란 테두리**로 옮겼다. 선택된 마커도 등급 색을
 * 그대로 유지해야 지도에서 등급이 끊기지 않는다.
 */
function createPinIcon(tier: Tier, selected: boolean) {
  const fill = TIER_COLORS[tier].marker;
  const stroke = selected ? SELECTED_STROKE : "#ffffff";
  const strokeWidth = selected ? 2.5 : 1.5;
  // 병원이 계속 늘어날 예정이라 마커가 빽빽해져도 지도가 복잡해 보이지
  // 않도록 기존(30/40)보다 작게 줄였다. 클릭 영역(iconSize)과 색 구분은
  // 그대로 유지되고 크기만 축소된다.
  const size = selected ? 30 : 22;
  const height = size * 1.3;

  return L.divIcon({
    className: "",
    html: `<svg width="${size}" height="${height}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.7 0 0.6 5.1 0.6 11.4 0.6 20 12 32 12 32s11.4-12 11.4-20.6C23.4 5.1 18.3 0 12 0z"
        fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
      <circle cx="12" cy="11.4" r="4.2" fill="#ffffff" />
    </svg>`,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

interface HospitalMapProps {
  hospitals: MappableHospital[];
  selectedSido: Sido | null;
  /** 검색 중이면 지역 대신 검색 결과에 맞춰 지도를 움직인다 */
  searchActive?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 지역을 고르면 그 지역으로, 병원을 고르면 그 병원 위치로 지도를 옮긴다.
 * 지역을 고르기 전(최초 진입)에는 전국 뷰를 그대로 둔다.
 */
function MapController({
  hospitals,
  selectedSido,
  searchActive,
  selectedId,
  markerRefs,
}: {
  hospitals: MappableHospital[];
  selectedSido: Sido | null;
  searchActive: boolean;
  selectedId: string | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();
  const boundsKey = hospitals.map((h) => h.id).join(",");

  useEffect(() => {
    // 최초 진입 상태에서는 MapContainer에 지정한 전국 뷰를 유지한다.
    if (!selectedSido && !searchActive) return;

    if (hospitals.length) {
      const bounds = L.latLngBounds(hospitals.map((h) => [h.lat, h.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: false });
      return;
    }

    // 검색 결과에 좌표가 하나도 없으면 지도를 억지로 옮기지 않는다.
    if (!selectedSido) return;

    // 좌표가 등록된 병원이 아직 없는 지역이면 지역 기준점으로 이동한다.
    const { center, zoom } = SIDO_VIEW[selectedSido];
    map.setView(center, zoom, { animate: false });
    // boundsKey로 목록이 실제로 바뀐 경우에만 다시 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedSido, searchActive, boundsKey]);

  useEffect(() => {
    const selected = hospitals.find((h) => h.id === selectedId);
    if (!selected) return;

    const target = L.latLng(selected.lat, selected.lng);
    const zoom = Math.max(map.getZoom(), 15);

    // 말풍선은 지도 이동이 끝난 뒤에 연다. 이동 중에 열면 말풍선의 autoPan이
    // map.panBy를 호출해 진행 중인 flyTo가 취소되기 때문이다.
    const openPopup = () => markerRefs.current[selected.id]?.openPopup();

    map.flyTo(target, zoom, { duration: FLY_DURATION_SEC });
    map.once("moveend", openPopup);

    // flyTo는 requestAnimationFrame으로 움직이므로, 화면이 그려지지 않는 상황
    // (비활성 탭 등)에서는 애니메이션이 진행되지 않는다. 그런 경우에도 최종
    // 위치는 맞도록 보정한다. 정상적으로 이동했다면 아래 조건에 걸리지 않는다.
    const fallback = window.setTimeout(() => {
      if (!map.getCenter().equals(target, 1e-4)) {
        map.setView(target, zoom, { animate: false });
      }
      openPopup();
    }, FLY_DURATION_SEC * 1000 + 300);

    return () => {
      window.clearTimeout(fallback);
      map.off("moveend", openPopup);
    };
  }, [map, hospitals, selectedId, markerRefs]);

  return null;
}

/**
 * react-leaflet v4의 `MapContainer`는 Leaflet 지도를 만드는 ref 콜백이 최초
 * 렌더의 context(=null)를 계속 물고 있어서, 같은 <div>에 ref가 다시 붙으면
 * 지도를 한 번 더 만들려다 "Map container is already initialized."로 실패한다.
 * 정리를 맡은 effect도 같은 이유로 context가 아직 null인 시점에 언마운트되면
 * `map.remove()`를 부르지 않아, 컨테이너에 Leaflet이 찍어둔 `_leaflet_id`와
 * 지도 인스턴스(이벤트 핸들러·타이머 포함)가 그대로 남는다. 그 뒷정리를
 * 여기서 대신한다.
 *
 * 두 가지 제약이 있어 이 컴포넌트는 `MapContainer` **안쪽**에 둔다.
 * - React는 언마운트 정리를 부모 → 자식 순서로 부르므로, 자식에 둬야
 *   `MapContainer` 자신의 정리가 끝난 뒤에 실행된다. 부모(HospitalMap)에 두면
 *   우리가 먼저 지운 지도를 `MapContainer`가 다시 remove()하다 터진다.
 * - 개발 모드 StrictMode의 이중 마운트는 effect만 다시 도는 것이라 컨테이너가
 *   문서에 그대로 붙어 있고 ref도 다시 붙지 않는다. 그때 지도를 지우면 지도를
 *   다시 만들 사람이 없어 화면이 빈다. 그래서 컨테이너가 문서에서 떨어져 나간
 *   진짜 언마운트에서만 지운다.
 *
 * 프레임에 기대지 않도록 requestAnimationFrame이나 애니메이션 콜백은 쓰지
 * 않는다(파일 위쪽 fadeAnimation 주석과 같은 이유).
 */
function MapCleanup() {
  const map = useMap();

  useEffect(() => {
    return () => {
      const container = map.getContainer() as HTMLElement & {
        _leaflet_id?: number;
      };

      // StrictMode의 가짜 언마운트: 지도는 계속 쓰이므로 손대지 않는다.
      if (container.isConnected) return;
      // MapContainer가 이미 정리했다면 _leaflet_id가 지워져 있다. 이때 다시
      // remove()를 부르면 Leaflet 내부에서 예외가 난다.
      if (container._leaflet_id === undefined) return;

      map.remove();
    };
  }, [map]);

  return null;
}

export default function HospitalMap({
  hospitals,
  selectedSido,
  searchActive = false,
  selectedId,
  onSelect,
}: HospitalMapProps) {
  // 카드에서 선택했을 때도 말풍선이 열리도록 MapController가 이 참조를 쓴다.
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const hoverCapable = useHoverCapable();

  return (
    <div className="relative h-full min-h-[320px] w-full">
      {!hospitals.length && (
        <p className="pointer-events-none absolute inset-x-0 top-3 z-[1000] mx-auto w-fit rounded-full bg-slate-900/75 px-3 py-1.5 text-xs text-white">
          {searchActive
            ? "검색 결과 중 지도에 표시할 좌표가 있는 곳이 없습니다"
            : selectedSido
              ? `${selectedSido}은(는) 아직 지도에 표시할 좌표가 없습니다`
              : "지도에 표시할 좌표가 없습니다"}
        </p>
      )}

      {/* fadeAnimation을 켜두면 Leaflet이 팝업에 0.2초 페이드인 트랜지션을 건다.
          프레임이 그려지지 않는 환경(비활성 탭 등)에서는 그 트랜지션이 진행되지
          않아 팝업이 opacity 0인 채로 남는다. 팝업에 담긴 병원명·전화번호는
          애니메이션에 의존하지 않고 바로 보여야 하므로 페이드를 끈다. */}
      <MapContainer
        center={NATIONWIDE_VIEW.center}
        zoom={NATIONWIDE_VIEW.zoom}
        scrollWheelZoom
        fadeAnimation={false}
        className="h-full min-h-[320px] w-full rounded-xl border border-slate-200"
      >
        {/* 한때 채도를 낮추는 CSS filter(saturate/brightness/contrast)를
            `.leaflet-container`에 걸어 "차분한 톤"으로 조정했었는데, 그러니
            마커와 지형이 흐릿해져 구분이 잘 안 된다는 피드백을 받아 걷어냈다.
            대체 타일도 두 가지 시도했다가 실패를 직접 스크린샷으로 확인하고
            되돌린 적이 있다 — CartoDB Positron은 지금 API 키를 요구해
            워터마크가 찍히고, Esri World Light Gray Canvas는 한국 지역이
            확대(줌 15+)에서 "Map data not yet available"만 나온다(커버리지
            없음). 그래서 검증된 기본 OSM 타일을 필터 없이 그대로 쓴다. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCleanup />

        <MapController
          hospitals={hospitals}
          selectedSido={selectedSido}
          searchActive={searchActive}
          selectedId={selectedId}
          markerRefs={markerRefs}
        />

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.lat, hospital.lng]}
            icon={createPinIcon(hospital.tier, hospital.id === selectedId)}
            zIndexOffset={hospital.id === selectedId ? 1000 : 0}
            ref={(marker) => {
              markerRefs.current[hospital.id] = marker;
            }}
            eventHandlers={{
              click: () => onSelect(hospital.id),
              // 마우스 환경에서는 커서만 올려도 말풍선을 미리 보여준다.
              ...(hoverCapable
                ? {
                    mouseover: (event: L.LeafletMouseEvent) => {
                      const marker = event.target as L.Marker;
                      // 커서를 올렸을 뿐인데 지도가 움직이면 어지럽고, 마커가
                      // 커서 밖으로 밀려나 곧바로 닫히기도 한다. 미리보기일 때는
                      // 지도를 옮기지 않는다.
                      const popup = marker.getPopup();
                      if (popup) popup.options.autoPan = false;
                      marker.openPopup();
                    },
                    mouseout: (event: L.LeafletMouseEvent) => {
                      const marker = event.target as L.Marker;
                      marker.closePopup();
                      // 카드/마커 선택으로 열 때는 다시 지도가 맞춰지도록 되돌린다.
                      const popup = marker.getPopup();
                      if (popup) popup.options.autoPan = true;
                    },
                  }
                : {}),
            }}
          >
            {/* autoPan은 켜 둔다. 지도 가장자리에서 열린 말풍선이 잘리지 않고
                화면 안으로 들어온다. flyTo와 충돌하지 않도록 말풍선은
                MapController가 지도 이동이 끝난 뒤에 연다. */}
            <Popup>
              <span className="block text-sm font-semibold text-slate-900">
                {hospital.name}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {hospital.tier} · {hospital.region.sido}{" "}
                {hospital.region.sigungu}
              </span>
              <span className="mt-1 block text-xs">
                {hospital.phone ? (
                  <a
                    href={`tel:${hospital.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {hospital.phone}
                  </a>
                ) : (
                  <span className="text-rose-600">전화번호 확인 필요</span>
                )}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
