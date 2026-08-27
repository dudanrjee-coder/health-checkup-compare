"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet은 `window`에 의존하므로 서버 렌더링에서 제외한다.
 *
 * **`dynamic()` 호출을 페이지가 아니라 이 전용 모듈에 둔다.** `dynamic()`은 부를
 * 때마다 새 컴포넌트 타입을 만들어 내는데, 이 호출이 `app/page.tsx`의 모듈
 * 스코프에 있으면 페이지 파일을 고칠 때마다(개발 모드 Fast Refresh) 지도의
 * 컴포넌트 타입이 새로 만들어진다. 그러면 react-leaflet v4의 `MapContainer`가
 * **이미 지도가 붙어 있는 같은 `<div>`** 에 ref를 다시 붙이려다
 * `Map container is already initialized.`로 터지고 지도가 사라진다
 * (README 70번 항목에 재현·계측 결과를 적어 두었다).
 *
 * 이 모듈은 페이지와 함께 바뀌지 않으므로, 페이지를 고쳐도 지도 컴포넌트
 * 타입이 그대로 유지되어 지도가 다시 만들어지지 않는다.
 */
const HospitalMapLazy = dynamic(() => import("@/components/HospitalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      지도를 불러오는 중…
    </div>
  ),
});

export default HospitalMapLazy;
