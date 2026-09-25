"use client";

import { useRef, useState } from "react";

/**
 * 히어로 섹션의 배경음악 웨이브폼. 브라우저 자동재생 정책 때문에 첫 소리는
 * 반드시 사용자 클릭에서만 시작되므로 마운트 시 play()를 시도하지 않는다.
 * 재생 상태는 audio의 play/pause 이벤트로만 갱신해 OS 미디어 키처럼 밖에서
 * 멈춘 경우에도 막대 움직임이 실제 상태와 어긋나지 않게 한다.
 *
 * 첫 클릭 전에는 확대된 웨이브폼 위에 "재생을 누르세요" 라벨이 계속 떠 있고,
 * 한 번 재생한 뒤에는 라벨 없이 작은 크기로 줄어 자리를 덜 차지한다.
 */

const VOLUME = 0.6;

/**
 * 막대 28개의 기본 높이(컨테이너 대비 %). 가운데가 가장 높고 양끝으로
 * 잦아드는 오디오 파형 모양이라 정지 상태에서도 파형으로 읽힌다.
 */
const BAR_HEIGHTS = [
  12, 20, 16, 28, 34, 26, 44, 56, 48, 68, 60, 82, 74, 96, 100, 88, 92, 76, 84,
  64, 70, 52, 58, 40, 46, 30, 24, 16,
];

/** 막대마다 주기와 시작점을 어긋나게 해야 음악에 맞춰 출렁이는 것처럼 보인다. */
const BARS = BAR_HEIGHTS.map((height, index) => ({
  height,
  duration: `${(0.6 + ((index * 7) % 8) * 0.09).toFixed(2)}s`,
  delay: `${(((index * 13) % 17) * 0.05).toFixed(2)}s`,
}));

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // 한 번이라도 재생을 시작했는지. 확대 상태와 라벨 노출을 함께 가른다.
  const [started, setStarted] = useState(false);

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    setStarted(true);

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

  const expanded = !started;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={playing}
      aria-label={playing ? "배경음악 정지" : "배경음악 재생"}
      className={`relative flex items-center justify-end focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-600 ${className}`}
    >
      <span
        className={`flex items-center transition-all duration-700 ease-out ${
          expanded ? "h-14 gap-[4px] xl:h-16 xl:gap-[6px]" : "h-6 gap-[3px] lg:h-7"
        }`}
      >
        {BARS.map((bar, index) => (
          <span
            key={index}
            className={`origin-center rounded-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-200 shadow-[0_0_5px_rgba(34,211,238,0.95),0_0_12px_rgba(8,145,178,0.5)] transition-all duration-700 ease-out ${
              expanded ? "w-[2px]" : "w-[1.5px]"
            } ${playing ? "animate-eq motion-reduce:animate-none" : ""}`}
            style={{
              height: `${bar.height}%`,
              ...(playing
                ? { animationDuration: bar.duration, animationDelay: bar.delay }
                : { transform: started ? "scaleY(0.45)" : "scaleY(1)" }),
            }}
          />
        ))}
      </span>

      {/* 첫 재생 전에만 파형 한가운데에 뜨는 삼각형 플레이 버튼. 파형 위에
          겹치므로 흰 글로우를 줘서 막대와 섞이지 않게 했다. */}
      {!started && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_rgba(255,255,255,0.95)] xl:h-10 xl:w-10"
        >
          <path d="M8 4.5 19 12 8 19.5Z" className="fill-cyan-700" />
        </svg>
      )}

      <audio
        ref={audioRef}
        src="/bgm.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </button>
  );
}
