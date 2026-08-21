"use client";

import { useEffect, useState } from "react";

/**
 * 마우스를 쓰는 환경(데스크톱)인지 판별한다.
 * 터치 기기에는 hover가 없으므로, 호버 기반 UI나 화면 키보드처럼
 * 마우스 전용 기능을 분기하는 데 쓴다.
 *
 * 서버 렌더링 시점에는 알 수 없으므로 false로 시작하고 마운트 후에 갱신한다.
 */
export function useHoverCapable(): boolean {
  const [hoverCapable, setHoverCapable] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return hoverCapable;
}
