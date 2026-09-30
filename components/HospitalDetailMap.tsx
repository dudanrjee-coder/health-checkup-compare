"use client";

import HospitalMapLazy from "@/components/HospitalMapLazy";
import { MappableHospital } from "@/types/hospital";

/**
 * 상세 페이지의 지도. **상세 페이지를 서버 컴포넌트로 유지하기 위한 경계다.**
 *
 * 페이지 본문(병원명·주소·검진 정보)은 서버에서 HTML로 렌더링돼야 검색엔진과
 * 애드센스가 읽을 수 있다. 그런데 `HospitalMap`은 `onSelect` 같은 함수 prop을
 * 받는 클라이언트 컴포넌트라 서버 컴포넌트에서 직접 부를 수 없다(함수는 직렬화
 * 되지 않는다). 그래서 지도만 이 작은 클라이언트 컴포넌트로 감싸고, 페이지는
 * 직렬화 가능한 병원 객체 하나만 넘긴다.
 *
 * 목록 화면과 달리 마커가 하나뿐이라 선택 개념이 없다. `selectedId`를 이 병원으로
 * 고정해 지도가 이 위치로 맞춰지게 하고, `onSelect`는 빈 함수를 준다.
 */
interface Props {
  hospital: MappableHospital;
}

export default function HospitalDetailMap({ hospital }: Props) {
  return (
    <HospitalMapLazy
      hospitals={[hospital]}
      selectedSido={hospital.region.sido}
      selectedId={hospital.id}
      onSelect={() => {}}
      minHeightClass="min-h-[200px]"
    />
  );
}
