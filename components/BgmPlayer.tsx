"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 히어로 섹션의 배경음악 토글. 브라우저 자동재생 정책 때문에 첫 소리는
 * 반드시 사용자 클릭에서만 시작되므로 마운트 시 play()를 시도하지 않는다.
 * 재생 상태는 audio의 play/pause 이벤트로만 갱신해 OS 미디어 키나 탭 정책
 * 때문에 밖에서 멈춘 경우에도 아이콘이 실제 상태와 어긋나지 않게 한다.
 */

const VOLUME = 0.6;
const HINT_VISIBLE_MS = 6000;

/** 막대마다 길이와 시작점을 어긋나게 줘야 사운드바처럼 보인다. */
const BARS = [
  { duration: "0.7s", delay: "0s", idle: 0.3 },
  { duration: "1.05s", delay: "0.18s", idle: 0.55 },
  { duration: "0.85s", delay: "0.36s", idle: 0.4 },
  { duration: "1.2s", delay: "0.09s", idle: 0.7 },
];

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), HINT_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    setHintVisible(false);

    if (!audio.paused) {
      audio.pause();
      return;
    }

    audio.volume = VOLUME;
    audio.play()?.catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[BgmPlayer] 재생 실패:", err?.name, err?.message);
      }
    });
  }

  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden={!hintVisible}
        className={`pointer-events-none absolute right-full top-1/2 z-10 mr-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur transition-all duration-700 md:mr-3 ${
          hintVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        클릭하고 음악과 함께 둘러보세요
      </span>

      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={playing}
        aria-label={playing ? "배경음악 정지" : "배경음악 재생"}
        title={playing ? "배경음악 정지" : "배경음악 재생"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-md backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:h-14 md:w-14"
      >
        <span className="flex h-5 items-end gap-[3px] md:h-6">
          {BARS.map((bar, index) => (
            <span
              key={index}
              className={`w-[3px] origin-bottom rounded-full bg-slate-800 transition-transform duration-300 ${
                playing ? "h-full animate-eq motion-reduce:animate-none" : "h-full"
              }`}
              style={
                playing
                  ? { animationDuration: bar.duration, animationDelay: bar.delay }
                  : { transform: `scaleY(${bar.idle})` }
              }
            />
          ))}
        </span>
      </button>

      <audio
        ref={audioRef}
        src="/bgm.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
