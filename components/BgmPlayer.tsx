"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 히어로 섹션의 배경음악 컨트롤. 브라우저 자동재생 정책 때문에 첫 소리는
 * 반드시 사용자 클릭에서만 시작되므로 마운트 시 play()를 시도하지 않고,
 * Web Audio 컨텍스트도 클릭 순간에 만든다(그 전에 만들면 suspended로 뜬다).
 *
 * 모양은 **가로로 쭉 이어진 바닥선 위에 가는 세로선이 솟는 스펙트럼**이다.
 * 왼쪽이 저음, 오른쪽이 고음이고, 봉우리는 왼쪽에 몰려 높게 솟았다가
 * 오른쪽으로 갈수록 낮아져 거의 바닥선만 남는다(`tilt`). 테두리·박스·발광
 * 없이 제목과 같은 짙은 남색을 반투명으로만 쓴다 — 히어로 배경이 밝은
 * 파스텔이라 흰색 계열은 보이지 않고, 진하게 칠하면 제목보다 먼저 눈에
 * 들어오기 때문이다.
 *
 * 재생 중에는 AnalyserNode로 실제 bgm.mp3의 주파수를 읽어 선마다 길이를
 * 매 프레임 다시 쓴다. React state로 돌리면 초당 60번 리렌더가 되므로
 * ref로 DOM을 직접 만진다.
 *
 * **루프는 소리가 날 때만, 그리고 화면에 보일 때만 돈다.** 정지 중이거나
 * 히어로가 스크롤로 화면 밖에 나가면 requestAnimationFrame을 끊는다.
 */

const VOLUME = 0.6;
/** 세로선 수. 주파수 대역도 이 수만큼 나눈다. */
const LINE_COUNT = 64;
/** 선 좌표계. preserveAspectRatio="none"으로 컨테이너 크기에 맞춰 늘린다. */
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 40;
/** 바닥선의 y. 세로선은 여기서 위로만 자란다. */
const BASE_Y = VIEW_HEIGHT - 2;
/** 소리가 가장 클 때 세로선 길이. */
const MAX_LENGTH = 34;
/** 정지 상태의 길이. 바닥선만 남는 느낌이 되도록 거의 0으로 둔다. */
const IDLE_LENGTH = 0.8;
/** reduce 모드에서 움직이지 않고 세워 둘 낮은 고정 높이(최대 길이 대비). */
const REDUCED_LEVEL = 0.16;

/** 선 색. 히어로 제목(text-slate-900)과 같은 짙은 남색이다. */
const LINE_COLOR = "#0f172a";
/** 세로선 불투명도. 요청 범위(40~55%) 안에서 은은한 쪽으로 잡았다. */
const BAR_OPACITY = 0.46;
/** 바닥선은 끊기지 않고 가로로 이어지므로 더 옅게 둬야 튀지 않는다. */
const BASELINE_OPACITY = 0.3;

/** 선 i의 가운데 x 좌표. 양끝이 잘리지 않게 칸 가운데에 놓는다. */
function lineX(index: number) {
  return ((index + 0.5) / LINE_COUNT) * VIEW_WIDTH;
}

/**
 * 선 i의 기울기 가중치(0~1). 왼쪽(저음)이 1, 오른쪽(고음)으로 갈수록 0에
 * 가까워진다.
 *
 * 스펙트럼을 그대로 그리면 요즘 음원은 고역도 제법 올라와서 오른쪽까지
 * 고르게 서 버린다. 참고한 모양은 왼쪽에 봉우리가 몰리고 오른쪽은 바닥선만
 * 남는 쪽이라, 지수 1.7로 오른쪽을 빠르게 눌렀다. 완전히 0으로 만들지 않고
 * 0.04를 남겨 둬서, 고음이 크게 들어오면 오른쪽도 아주 조금은 반응한다.
 */
function tilt(index: number) {
  const t = index / (LINE_COUNT - 1);
  return 0.04 + 0.96 * Math.pow(1 - t, 1.7);
}

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const linesRef = useRef<Array<SVGLineElement | null>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef<number | null>(null);
  /** 선별 주파수 대역(로그 간격)과 직전 길이. 선끼리 따로 움직이게 하는 데 쓴다. */
  const bandsRef = useRef<Array<{ from: number; to: number; decay: number }>>([]);
  const levelsRef = useRef<number[]>(new Array(LINE_COUNT).fill(0));
  /** 루프를 걸지 말지 판단하는 값들. 이벤트 콜백이 state를 기다릴 수 없어 ref로 둔다. */
  const reducedRef = useRef(false);
  const visibleRef = useRef(true);
  const playingRef = useRef(false);
  const rootRef = useRef<HTMLButtonElement | null>(null);

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

  /**
   * 선 하나의 길이를 반영한다. 아래 끝은 바닥선에 고정이고 위로만 자란다.
   * 소리에서 얻은 길이에 왼쪽으로 기운 가중치를 곱해, 같은 음량이어도
   * 왼쪽 선이 높이 솟고 오른쪽 선은 바닥선에 붙어 남는다.
   */
  const drawLine = useCallback((index: number, level: number) => {
    const line = linesRef.current[index];
    if (!line) return;
    const length =
      (IDLE_LENGTH + level * (MAX_LENGTH - IDLE_LENGTH)) * tilt(index);
    line.setAttribute("y1", (BASE_Y - length).toFixed(2));
  }, []);

  const resetLines = useCallback(() => {
    levelsRef.current.fill(0);
    for (let i = 0; i < LINE_COUNT; i += 1) drawLine(i, 0);
  }, [drawLine]);

  const runLoop = useCallback(() => {
    if (!linesRef.current[0]) return;
    // 화면 밖으로 나갔으면 다음 프레임을 예약하지 않고 여기서 끊는다.
    // 다시 보이면 IntersectionObserver가 루프를 새로 건다.
    if (!visibleRef.current) {
      frameRef.current = null;
      return;
    }

    const analyser = analyserRef.current;
    const data = dataRef.current;

    if (analyser && data) {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < LINE_COUNT; i += 1) {
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
        // 요즘 음원은 계속 크게 눌려 있어서 그대로 쓰면 선이 전부 천장에 붙는다.
        // 거듭제곱으로 조용한 대역을 더 낮춰 선 사이 길이 차를 만든다.
        const shaped = Math.pow(raw, 1.4);
        // 예전에는 여기서 고역을 키웠는데(`1 + i/LINE_COUNT * 1.3`), 그러면
        // 오른쪽까지 고르게 서서 "왼쪽에 봉우리가 몰린" 모양이 나오지 않는다.
        // 지금은 tilt()가 가로 모양을 맡으므로 스펙트럼을 그대로 쓴다.
        const target = Math.min(1, shaped);
        // 선마다 다른 속도로 줄어들게 해서 한 덩어리로 움직이지 않게 한다.
        const previous = levelsRef.current[i] * band.decay;
        levelsRef.current[i] = target > previous ? target : previous;
      }
    } else {
      // Web Audio를 못 쓰는 환경. 소리와는 무관하지만 선이 멈춰 있지는 않게 한다.
      const seconds = performance.now() / 1000;
      for (let i = 0; i < LINE_COUNT; i += 1) {
        levelsRef.current[i] = 0.3 + 0.25 * Math.sin(seconds * (1.1 + i * 0.13) + i);
      }
    }

    for (let i = 0; i < LINE_COUNT; i += 1) drawLine(i, levelsRef.current[i]);
    frameRef.current = requestAnimationFrame(runLoop);
  }, [drawLine]);

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
      // 해상도를 충분히 주고 스무딩을 낮춰야 선마다 다른 소리를 잡는다.
      analyser.fftSize = 1024;
      // 값이 프레임마다 튀지 않게 충분히 부드럽게 둔다.
      analyser.smoothingTimeConstant = 0.8;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      // 사람이 듣는 음높이는 로그 간격이라, 대역도 로그로 갈라야 저음 쪽과
      // 고음 쪽이 서로 다른 악기를 따라간다. 균등 분할하면 전부 같이 출렁인다.
      const minBin = 2;
      const maxBin = Math.max(minBin + LINE_COUNT, Math.floor(analyser.frequencyBinCount * 0.55));
      const ratio = Math.pow(maxBin / minBin, 1 / LINE_COUNT);
      bandsRef.current = Array.from({ length: LINE_COUNT }, (_, i) => {
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

  /**
   * reduce 모드에서는 루프를 아예 돌리지 않고 낮은 고정 모양만 세워 둔다.
   * 바닥선은 그대로 보이므로 "정지한 스펙트럼"으로 읽힌다.
   */
  useEffect(() => {
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    if (!reduced) return;

    stopLoop();
    levelsRef.current.fill(REDUCED_LEVEL);
    for (let i = 0; i < LINE_COUNT; i += 1) drawLine(i, REDUCED_LEVEL);
  }, [drawLine, stopLoop]);

  /**
   * 히어로가 스크롤로 화면 밖에 나가면 루프를 끊는다. 보이지도 않는 선
   * 64개를 매 프레임 다시 그릴 이유가 없다. 다시 보이면, 그때도 여전히
   * 재생 중이고 reduce 모드가 아닐 때만 루프를 되건다.
   */
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (!entry.isIntersecting) {
        stopLoop();
        return;
      }
      if (playingRef.current && !reducedRef.current && frameRef.current === null) {
        frameRef.current = requestAnimationFrame(runLoop);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [runLoop, stopLoop]);

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
    playingRef.current = true;
    stopLoop();
    // reduce 모드에서는 소리만 나고 선은 고정된 낮은 모양 그대로 둔다.
    if (reducedRef.current || !visibleRef.current) return;
    frameRef.current = requestAnimationFrame(runLoop);
  }

  function handlePause() {
    setPlaying(false);
    playingRef.current = false;
    stopLoop();
    if (reducedRef.current) return;
    resetLines();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={playing}
      aria-label={playing ? "배경음악 정지" : "배경음악 재생"}
      ref={rootRef}
      className={`relative flex h-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 ${className}`}
    >
      {/* 발광(drop-shadow)과 세로 그라데이션을 걷어내고 단색 반투명으로만
          그린다. 히어로 배경이 밝은 파스텔이라 얇은 선에 빛 번짐이 얹히면
          색이 뜨고, 배경 위에 그냥 얹힌 느낌이 나지 않는다. */}
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-6 w-48"
      >
        {/* 가로로 쭉 이어진 바닥선. 세로선이 전부 내려앉아도 이 선은 남는다. */}
        <line
          x1="0"
          x2={VIEW_WIDTH}
          y1={BASE_Y}
          y2={BASE_Y}
          stroke={LINE_COLOR}
          strokeOpacity={BASELINE_OPACITY}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {Array.from({ length: LINE_COUNT }, (_, index) => (
          <line
            key={index}
            ref={(el) => {
              linesRef.current[index] = el;
            }}
            x1={lineX(index)}
            x2={lineX(index)}
            y1={BASE_Y - IDLE_LENGTH * tilt(index)}
            y2={BASE_Y}
            stroke={LINE_COLOR}
            strokeOpacity={BAR_OPACITY}
            strokeWidth={1.5}
            // 끝을 둥글게 하면 1.5px 선에서는 뭉툭한 점처럼 보여 바닥선과
            // 겹친다. 각지게 둬야 가는 스펙트럼 느낌이 산다.
            strokeLinecap="butt"
            // preserveAspectRatio="none"로 늘리면 선 굵기까지 찌그러지므로 고정한다.
            vectorEffect="non-scaling-stroke"
          />
        ))}
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
