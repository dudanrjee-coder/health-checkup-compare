"use client";

import { useEffect, useRef } from "react";

/** 카운트업에 쓰는 시간(ms). */
const COUNT_UP_MS = 900;

interface HeroStatValueProps {
  /** 실제 데이터에서 계산된 최종값. 하드코딩하지 않는다(lib/hospitals.ts의 getHeaderStats). */
  value: number;
}

/**
 * 히어로 통계 배지의 숫자. 0부터 실제 값까지 약 900ms 동안 올라간다.
 *
 * **읽히는 숫자와 보이는 숫자를 나눈다.** 스크린리더용 `sr-only` 텍스트에는
 * 처음부터 실제 값이 들어 있고, 애니메이션이 도는 쪽은 `aria-hidden`이라
 * 보조기기에는 "720, 3, 47, 128…" 같은 중간값이 읽히지 않는다.
 *
 * **레이아웃이 흔들리지 않게** 자리를 미리 잡아 둔다. 최종값의 자릿수만큼
 * `ch` 폭을 확보하고(`minWidth`) 오른쪽 정렬 + `tabular-nums`(숫자마다 폭이
 * 같은 글리프)를 쓴다. 이게 없으면 7 → 72 → 720으로 자릿수가 늘 때마다
 * 배지 폭이 커져 옆 배지가 밀리고 CLS가 생긴다.
 *
 * 값은 서버 렌더링 단계에서도 최종값으로 찍힌다. JS가 없거나 실행 전이어도
 * 정확한 숫자가 보이고, 하이드레이션 불일치도 나지 않는다. 카운트업은
 * 마운트 뒤 ref로 textContent만 바꿔서 돌린다 — state로 돌리면 초당 60번
 * 리렌더가 되고, 그 비용이 같은 페이지의 카드 720개에 그대로 얹힌다.
 */
export default function HeroStatValue({ value }: HeroStatValueProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // reduce 모드에서는 애니메이션 없이 최종값 그대로 둔다(이미 찍혀 있다).
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      // ease-out cubic — 빠르게 올라갔다가 끝에서 부드럽게 멈춘다.
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // 중간값에서 멈춘 채 남지 않도록 정리 시 최종값으로 되돌린다.
      node.textContent = String(value);
    };
  }, [value]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span
        ref={ref}
        aria-hidden="true"
        className="inline-block text-right tabular-nums"
        style={{ minWidth: `${String(value).length}ch` }}
      >
        {value}
      </span>
    </>
  );
}
