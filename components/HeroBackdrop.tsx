"use client";

import { useEffect, useRef } from "react";

/**
 * 히어로 배경에 떠다니는 흐릿한 빛 덩어리 2개(파랑·분홍).
 *
 * 기존 그라데이션(`bg-gradient-to-br`) **위에** 얹는 장식이라 배경 자체는
 * 건드리지 않는다. 움직임은 `transform`만 쓴다(`app/globals.css`의
 * `hero-drift-1/2`). left/top을 움직이면 매 프레임 레이아웃이 다시 잡히고,
 * blur가 걸린 큰 요소라 그 비용이 특히 크다.
 *
 * **히어로가 화면 밖으로 나가면 애니메이션을 멈춘다.** 보이지도 않는
 * blur(60px) 원 두 개를 계속 합성하면 스크롤 내내 GPU를 쓰게 된다.
 * IntersectionObserver가 없는 환경에서는 그냥 계속 돌게 두는데, 이때도
 * 화면에 이상은 없고 전력만 조금 더 쓴다.
 *
 * reduce 모드에서는 globals.css가 애니메이션 자체를 걸지 않으므로 여기서
 * 따로 분기하지 않아도 정지 상태가 된다. playState를 바꾸는 것은 애니메이션이
 * 없는 요소에는 아무 영향이 없다.
 */
export default function HeroBackdrop() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") return;

    const blobs = Array.from(
      root.querySelectorAll<HTMLElement>("[data-hero-blob]")
    );

    const observer = new IntersectionObserver(([entry]) => {
      for (const blob of blobs) {
        blob.style.animationPlayState = entry.isIntersecting
          ? "running"
          : "paused";
      }
    });

    // 히어로 자체가 아니라 이 컨테이너를 본다. 컨테이너가 히어로를 꽉
    // 채우고 있어(inset-0) 교차 판정이 같고, 히어로 DOM을 참조하지 않아도 된다.
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* 색은 기존 히어로 그라데이션(sky-100 → indigo-50 → pink-100)을 덮지
          않을 만큼 연하게 잡았다. 처음에 sky-300/pink-300으로 넣었더니 원래의
          은은한 배경이 파랑·분홍 두 덩어리로 갈려 보여서 한 단계 내렸다.

          **흐릿함은 `filter: blur()`가 아니라 radial-gradient로 만든다.**
          처음에는 단색 원에 `blur(60px)`을 걸었는데, 400px짜리 원 두 개를
          블러로 래스터하는 비용이 모바일(CPU 4배 감속) Lighthouse에서
          점수 -5, LCP +175ms로 잡혔다. 색이 중심에서 투명으로 퍼지는
          그라데이션은 같은 모양을 필터 없이 만들어서 래스터가 훨씬 싸다.

          `willChange: transform`으로 합성 레이어를 미리 잡아 두면, 움직이는
          동안 다시 그리지 않고 레이어를 옮기기만 한다. */}
      <span
        data-hero-blob
        className="hero-blob-1 absolute -left-28 -top-24 block h-[320px] w-[320px] rounded-full sm:h-[420px] sm:w-[420px]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(186,230,253,0.85) 0%, rgba(186,230,253,0.45) 45%, rgba(186,230,253,0) 70%)",
          willChange: "transform",
        }}
      />
      <span
        data-hero-blob
        className="hero-blob-2 absolute -right-24 top-10 block h-[300px] w-[300px] rounded-full sm:h-[380px] sm:w-[380px]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(251,207,232,0.85) 0%, rgba(251,207,232,0.45) 45%, rgba(251,207,232,0) 70%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
