"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 히어로 섹션의 배경음악 컨트롤. 브라우저 자동재생 정책 때문에 첫 소리는
 * 반드시 사용자 클릭에서만 시작되므로 마운트 시 play()를 시도하지 않고,
 * Web Audio 컨텍스트도 클릭 순간에 만든다(그 전에 만들면 suspended로 뜬다).
 *
 * 재생 중에는 AnalyserNode로 실제 bgm.mp3의 주파수를 읽어 막대 20개의
 * scaleY를 매 프레임 직접 써 넣는다. React state로 돌리면 초당 60번 리렌더가
 * 되므로 ref로 DOM을 직접 만진다. Web Audio를 못 쓰는 환경에서는 CSS
 * 애니메이션(animate-eq)으로 물러난다.
 */

const VOLUME = 0.6;
const BAR_COUNT = 20;
/** 정지 상태에서 모든 막대가 갖는 높이 비율. 20개가 같은 크기로 낮게 깔린다. */
const IDLE_SCALE = 0.35;
/** 주파수 데이터 중 실제로 귀에 들리는 대역만 쓴다(고역 끝은 거의 0이라 뺀다). */
const USED_BINS = 48;

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  // Web Audio를 못 만들었을 때만 CSS 애니메이션으로 대체한다.
  const [useCssFallback, setUseCssFallback] = useState(false);

  const resetBars = useCallback(() => {
    for (const bar of barsRef.current) {
      if (bar) bar.style.transform = `scaleY(${IDLE_SCALE})`;
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const runLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;

    analyser.getByteFrequencyData(data);
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const bar = barsRef.current[i];
      if (!bar) continue;
      const from = Math.floor((i / BAR_COUNT) * USED_BINS);
      const to = Math.max(from + 1, Math.floor(((i + 1) / BAR_COUNT) * USED_BINS));
      let sum = 0;
      for (let bin = from; bin < to; bin += 1) sum += data[bin];
      // 저역은 늘 세고 고역은 약해서, 그대로 쓰면 왼쪽 막대만 천장에 붙는다.
      // 오른쪽으로 갈수록 이득을 키워 20개가 고르게 움직이게 한다.
      const level = sum / (to - from) / 255;
      const gain = 0.75 + (i / BAR_COUNT) * 2.1;
      const scale = IDLE_SCALE + Math.min(1, level * gain) * (1 - IDLE_SCALE);
      bar.style.transform = `scaleY(${scale.toFixed(3)})`;
    }

    frameRef.current = requestAnimationFrame(runLoop);
  }, []);

  /** 클릭 순간에만 부른다. 실패하면 null을 돌려주고 CSS 애니메이션으로 물러난다. */
  function ensureAnalyser(audio: HTMLAudioElement) {
    if (analyserRef.current) return analyserRef.current;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    try {
      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      return analyser;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[BgmPlayer] Web Audio 사용 불가:", err);
      }
      return null;
    }
  }

  useEffect(() => {
    return () => {
      stopLoop();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [stopLoop]);

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    setStarted(true);

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (!ensureAnalyser(audio)) setUseCssFallback(true);
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }

    audio.volume = VOLUME;
    audio.play()?.catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[BgmPlayer] 재생 실패:", err?.name, err?.message);
      }
    });
  }

  function handlePlay() {
    setPlaying(true);
    if (analyserRef.current) {
      stopLoop();
      frameRef.current = requestAnimationFrame(runLoop);
    }
  }

  function handlePause() {
    setPlaying(false);
    stopLoop();
    resetBars();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={playing}
      aria-label={playing ? "배경음악 정지" : "배경음악 재생"}
      className={`relative flex h-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 ${className}`}
    >
      <span className="flex h-5 items-center gap-[4px]">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(el) => {
              barsRef.current[index] = el;
            }}
            className={`h-full w-[3px] origin-center rounded-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-200 shadow-[0_0_4px_rgba(34,211,238,0.95),0_0_10px_rgba(8,145,178,0.55)] ${
              playing && useCssFallback ? "animate-eq motion-reduce:animate-none" : ""
            }`}
            style={
              playing && useCssFallback
                ? {
                    animationDuration: `${(0.55 + (index % 5) * 0.12).toFixed(2)}s`,
                    animationDelay: `${((index % 7) * 0.08).toFixed(2)}s`,
                  }
                : { transform: `scaleY(${IDLE_SCALE})` }
            }
          />
        ))}
      </span>

      {/* 첫 재생 전에만 막대 한가운데에 뜨는 원형 플레이 버튼. */}
      {!started && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_0_16px_rgba(34,211,238,0.6)] ring-1 ring-cyan-400/70 backdrop-blur">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-[2px] h-5 w-5 fill-cyan-700">
            <path d="M8 4.5 19 12 8 19.5Z" />
          </svg>
        </span>
      )}

      <audio
        ref={audioRef}
        src="/bgm.mp3"
        loop
        preload="none"
        onPlay={handlePlay}
        onPause={handlePause}
      />
    </button>
  );
}
