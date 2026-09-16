"use client";

import { useRef } from "react";
import { useHoverCapable } from "@/lib/useHoverCapable";

/**
 * 히어로 타이틀 옆의 원형 영상. 기본은 무음 자동재생·반복이고,
 * 마우스를 올리면(데스크톱 전용) 소리를 켠다. 터치 기기는 hover가
 * 없으므로 useHoverCapable로 걸러 무음 자동재생 상태만 유지한다.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverCapable = useHoverCapable();

  const handleMouseEnter = () => {
    if (!hoverCapable) return;
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      // 음소거 해제가 브라우저 자동재생 정책에 막히면(play()가 reject되면)
      // 무음으로 되돌려 최소한 자동재생만은 계속 유지한다.
      video.play()?.catch(() => {
        video.muted = true;
      });
    } catch {
      video.muted = true;
    }
  };

  const handleMouseLeave = () => {
    if (!hoverCapable) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-28 w-28 shrink-0 overflow-hidden rounded-full shadow-md sm:h-32 sm:w-32"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover object-[center_30%]"
      >
        <source src="/videos/hero-video.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
