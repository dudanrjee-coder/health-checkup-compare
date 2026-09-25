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

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef<number | null>(null);
  /** 막대별 주파수 대역 경계(로그 간격)와 직전 높이. 막대마다 따로 떨어뜨리는 데 쓴다. */
  const bandsRef = useRef<Array<{ from: number; to: number; decay: number }>>([]);
  const levelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  // 문서 클릭 리스너가 state 갱신을 기다리지 않고 바로 볼 수 있어야 한다.
  const startedRef = useRef(false);
  // Web Audio를 못 만들었을 때만 CSS 애니메이션으로 대체한다.
  const [useCssFallback, setUseCssFallback] = useState(false);

  const resetBars = useCallback(() => {
    levelsRef.current.fill(0);
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
      const band = bandsRef.current[i];
      if (!bar || !band) continue;

      let sum = 0;
      let peak = 0;
      for (let bin = band.from; bin < band.to; bin += 1) {
        sum += data[bin];
        if (data[bin] > peak) peak = data[bin];
      }
      const average = sum / (band.to - band.from) / 255;
      const raw = average * 0.7 + (peak / 255) * 0.3;
      // 요즘 음원은 계속 크게 눌려 있어서 그대로 쓰면 20개가 다 천장에 붙는다.
      // 거듭제곱으로 조용한 대역을 더 낮춰 막대 사이 높이 차를 만든다.
      const shaped = Math.pow(raw, 1.6);
      // 고역으로 갈수록 에너지가 작아 그대로 두면 오른쪽이 안 움직인다.
      const gain = 1 + (i / BAR_COUNT) * 1.3;
      const target = Math.min(1, shaped * gain);
      // 막대마다 다른 속도로 내려오게 해서 서로 붙어 움직이지 않게 한다.
      const previous = levelsRef.current[i] * band.decay;
      const level = target > previous ? target : previous;
      levelsRef.current[i] = level;

      const scale = IDLE_SCALE + level * (1 - IDLE_SCALE);
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
      // 해상도를 충분히 주고 스무딩을 낮춰야 막대가 각자 다른 소리를 잡는다.
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      // 사람이 듣는 음높이는 로그 간격이라, 대역도 로그로 갈라야 저음 막대와
      // 고음 막대가 서로 다른 악기를 따라간다. 균등 분할하면 전부 같이 출렁인다.
      const minBin = 2;
      const maxBin = Math.max(minBin + BAR_COUNT, Math.floor(analyser.frequencyBinCount * 0.55));
      const ratio = Math.pow(maxBin / minBin, 1 / BAR_COUNT);
      bandsRef.current = Array.from({ length: BAR_COUNT }, (_, i) => {
        const from = Math.floor(minBin * Math.pow(ratio, i));
        return {
          from,
          to: Math.max(from + 1, Math.floor(minBin * Math.pow(ratio, i + 1))),
          decay: 0.75 + (i % 5) * 0.02,
        };
      });
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

  const startPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;

    // Web Audio 컨텍스트는 반드시 클릭 안에서 만들어야 suspended로 뜨지 않는다.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 재생 버튼을 못 보고 지나치는 사람을 위해, 첫 재생 전에는 페이지
   * 아무 곳이나 클릭해도 음악이 시작된다. 클릭 자체는 가로채지 않으므로
   * 검색·필터 같은 원래 동작은 그대로 일어난다. 한 번 시작되면 이 리스너는
   * 사라져서, 이후의 클릭은 음악에 아무 영향도 주지 않는다.
   */
  useEffect(() => {
    if (started) return;

    const handleFirstClick = () => {
      if (startedRef.current) return;
      startPlayback();
    };

    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, [started, startPlayback]);

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }
    startPlayback();
  }

  /**
   * 재생 버튼을 감추고 크기를 줄이는 건 실제로 소리가 나기 시작한 다음이다.
   * 클릭 시점에 미리 감추면, 재생이 막혔을 때 누를 곳이 사라져 버린다.
   */
  function handlePlay() {
    startedRef.current = true;
    setStarted(true);
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
      className={`relative flex items-center justify-center transition-all duration-700 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 ${
        started ? "h-11" : "h-[104px] md:h-[128px]"
      } ${className}`}
    >
      {/* 첫 재생 전에는 막대 간격을 벌려, 가운데 큰 재생 버튼 양옆으로 막대가 보이게 한다. */}
      <span
        className={`flex h-5 items-center transition-all duration-700 ease-out ${
          started ? "gap-[4px]" : "gap-[8px] md:gap-[10px]"
        }`}
      >
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(el) => {
              barsRef.current[index] = el;
            }}
            className={`h-full w-px origin-center rounded-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-200 shadow-[0_0_4px_rgba(34,211,238,0.95),0_0_10px_rgba(8,145,178,0.55)] ${
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

      {/* 첫 재생 전에만 막대 한가운데에 뜨는 원형 플레이 버튼. 누르는 자리라는 게
          한눈에 보여야 해서 히어로 영역이 허용하는 만큼 크게 잡았다. */}
      {!started && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_0_28px_rgba(34,211,238,0.6)] ring-2 ring-cyan-400/70 backdrop-blur md:h-32 md:w-32">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-[4px] h-10 w-10 fill-cyan-700 md:h-14 md:w-14">
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
