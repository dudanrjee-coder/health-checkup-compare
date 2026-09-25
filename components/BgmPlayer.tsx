"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 히어로 섹션의 배경음악 컨트롤. 브라우저 자동재생 정책 때문에 첫 소리는
 * 반드시 사용자 클릭에서만 시작되므로 마운트 시 play()를 시도하지 않고,
 * Web Audio 컨텍스트도 클릭 순간에 만든다(그 전에 만들면 suspended로 뜬다).
 *
 * 파형은 SVG path 하나다. 재생 중에는 AnalyserNode로 실제 bgm.mp3의 주파수를
 * 읽어 매 프레임 path의 d를 다시 쓴다. React state로 돌리면 초당 60번
 * 리렌더가 되므로 ref로 DOM을 직접 만진다.
 */

const VOLUME = 0.6;
/** 선을 만드는 꼭짓점 수. 주파수 대역도 이 수만큼 나눈다. */
const POINT_COUNT = 20;
/** path 좌표계. preserveAspectRatio="none"으로 컨테이너 크기에 맞춰 늘린다. */
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 40;
const CENTER_Y = VIEW_HEIGHT / 2;
const MAX_SWING = 17;
/** 정지 상태에서는 가운데를 가로지르는 곧은 선이다. */
const IDLE_PATH = `M 0 ${CENTER_Y} L ${VIEW_WIDTH} ${CENTER_Y}`;

/** 꼭짓점을 중점 기준 2차 베지에로 이어 각지지 않은 곡선으로 만든다. */
function buildPath(levels: number[]) {
  const points = levels.map((level, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    return {
      x: (index / (POINT_COUNT - 1)) * VIEW_WIDTH,
      y: CENTER_Y + direction * level * MAX_SWING,
    };
  });

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return d;
}

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef<number | null>(null);
  /** 꼭짓점별 주파수 대역(로그 간격)과 직전 높이. 서로 따로 움직이게 하는 데 쓴다. */
  const bandsRef = useRef<Array<{ from: number; to: number; decay: number }>>([]);
  const levelsRef = useRef<number[]>(new Array(POINT_COUNT).fill(0));

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  // 문서 클릭 리스너가 state 갱신을 기다리지 않고 바로 볼 수 있어야 한다.
  const startedRef = useRef(false);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const resetLine = useCallback(() => {
    levelsRef.current.fill(0);
    pathRef.current?.setAttribute("d", IDLE_PATH);
  }, []);

  const runLoop = useCallback(() => {
    const path = pathRef.current;
    if (!path) return;

    const analyser = analyserRef.current;
    const data = dataRef.current;

    if (analyser && data) {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < POINT_COUNT; i += 1) {
        const band = bandsRef.current[i];
        if (!band) continue;

        let sum = 0;
        let peak = 0;
        for (let bin = band.from; bin < band.to; bin += 1) {
          sum += data[bin];
          if (data[bin] > peak) peak = data[bin];
        }
        const average = sum / (band.to - band.from) / 255;
        const raw = average * 0.7 + (peak / 255) * 0.3;
        // 요즘 음원은 계속 크게 눌려 있어서 그대로 쓰면 선이 천장에 붙는다.
        // 거듭제곱으로 조용한 대역을 더 낮춰 마루와 골을 만든다.
        const shaped = Math.pow(raw, 1.6);
        // 고역으로 갈수록 에너지가 작아 그대로 두면 오른쪽이 안 움직인다.
        const gain = 1 + (i / POINT_COUNT) * 1.3;
        const target = Math.min(1, shaped * gain);
        // 꼭짓점마다 다른 속도로 내려오게 해서 선이 통째로 움직이지 않게 한다.
        const previous = levelsRef.current[i] * band.decay;
        levelsRef.current[i] = target > previous ? target : previous;
      }
    } else {
      // Web Audio를 못 쓰는 환경. 소리와는 무관하지만 선이 멈춰 있지는 않게 한다.
      const seconds = performance.now() / 1000;
      for (let i = 0; i < POINT_COUNT; i += 1) {
        levelsRef.current[i] = 0.25 + 0.18 * Math.sin(seconds * (1.1 + i * 0.13) + i);
      }
    }

    path.setAttribute("d", buildPath(levelsRef.current));
    frameRef.current = requestAnimationFrame(runLoop);
  }, []);

  /** 클릭 순간에만 부른다. 실패하면 null을 돌려주고 소리 없이 움직이는 선으로 물러난다. */
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
      // 해상도를 충분히 주고 스무딩을 낮춰야 꼭짓점이 각자 다른 소리를 잡는다.
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      // 사람이 듣는 음높이는 로그 간격이라, 대역도 로그로 갈라야 저음 쪽과
      // 고음 쪽이 서로 다른 악기를 따라간다. 균등 분할하면 전부 같이 출렁인다.
      const minBin = 2;
      const maxBin = Math.max(minBin + POINT_COUNT, Math.floor(analyser.frequencyBinCount * 0.55));
      const ratio = Math.pow(maxBin / minBin, 1 / POINT_COUNT);
      bandsRef.current = Array.from({ length: POINT_COUNT }, (_, i) => {
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
    ensureAnalyser(audio);
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
    stopLoop();
    frameRef.current = requestAnimationFrame(runLoop);
  }

  function handlePause() {
    setPlaying(false);
    stopLoop();
    resetLine();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={playing}
      aria-label={playing ? "배경음악 정지" : "배경음악 재생"}
      className={`relative flex h-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 ${className}`}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-6 w-36 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]"
      >
        <defs>
          {/* 정지 상태의 곧은 선은 바운딩 박스 높이가 0이라, 기본값인
              objectBoundingBox 좌표계로는 그라데이션이 아예 칠해지지 않는다. */}
          <linearGradient
            id="bgm-line-gradient"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={VIEW_WIDTH}
            y2="0"
          >
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          d={IDLE_PATH}
          fill="none"
          stroke="url(#bgm-line-gradient)"
          strokeWidth={1.5}
          strokeLinecap="round"
          // preserveAspectRatio="none"로 늘리면 선 굵기까지 찌그러지므로 고정한다.
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 첫 재생 전에만 선 한가운데에 뜨는 원형 플레이 버튼. */}
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
