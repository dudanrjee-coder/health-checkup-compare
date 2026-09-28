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
 * 재생 중에는 AnalyserNode로 실제 재생 중인 곡의 주파수를 읽어 선마다 길이를
 * 매 프레임 다시 쓴다. React state로 돌리면 초당 60번 리렌더가 되므로
 * ref로 DOM을 직접 만진다.
 *
 * **루프는 소리가 날 때만, 그리고 화면에 보일 때만 돈다.** 정지 중이거나
 * 히어로가 스크롤로 화면 밖에 나가면 requestAnimationFrame을 끊는다.
 *
 * 곡은 8곡 재생목록을 순서대로 돌고 마지막 곡 다음에 1번으로 돌아간다.
 * **<audio> 요소는 하나뿐이고 src만 바꾼다** — 새 Audio 객체를 만들면
 * iOS Safari에서 첫 클릭으로 얻은 재생 권한이 그 객체에는 없어서 소리가
 * 나지 않는다. 같은 이유로 AudioContext와 분석기도 한 번 만든 뒤 계속 쓴다
 * (createMediaElementSource는 src가 아니라 **요소**에 묶이므로 곡을 바꿔도
 * 연결이 유지된다).
 */

/**
 * 재생 목록. **순서를 바꾸려면 이 배열만 고치면 된다.**
 * `title`은 화면에 쓰지 않는다 — 파일명만으로는 어떤 곡인지 알 수 없어
 * 순서를 손볼 때 헷갈리지 않도록 적어 둔 것이다.
 */
const PLAYLIST = [
  { title: "가을비가 내리면", src: "/bgm/01-autumn-rain.mp3" },
  { title: "낙엽이 지면", src: "/bgm/02-falling-leaves.mp3" },
  { title: "노을이 물든 길", src: "/bgm/03-sunset-road.mp3" },
  { title: "마른 잎", src: "/bgm/04-dry-leaf.mp3" },
  { title: "바람은 네 이름을 데려와", src: "/bgm/05-wind-brings-your-name.mp3" },
  { title: "비 오는 가을", src: "/bgm/06-rainy-autumn.mp3" },
  { title: "아침 햇살", src: "/bgm/07-morning-sunlight.mp3" },
  { title: "지는 노을처럼", src: "/bgm/08-like-a-fading-sunset.mp3" },
] as const;

const VOLUME = 0.6;
/** 세로선 수. 주파수 대역도 이 수만큼 나눈다. */
const LINE_COUNT = 64;
/** 선 좌표계. preserveAspectRatio="none"으로 컨테이너 크기에 맞춰 늘린다. */
const VIEW_WIDTH = 100;
/**
 * 세로 좌표계. 최대 길이를 34 → 48로 키우면서 함께 늘렸다.
 * **바깥 버튼은 계속 `h-11`이라 히어로 레이아웃은 밀리지 않는다** — 늘어난
 * 것은 이 안쪽 좌표계와 SVG 자체의 높이(h-6 → h-10, 44px 안에 들어감)뿐이다.
 */
const VIEW_HEIGHT = 54;
/** 바닥선의 y. 세로선은 여기서 위로만 자란다. */
const BASE_Y = VIEW_HEIGHT - 2;
/** 소리가 가장 클 때 세로선 길이. */
const MAX_LENGTH = 48;
/** 정지 상태의 길이. 바닥선만 남는 느낌이 되도록 거의 0으로 둔다. */
const IDLE_LENGTH = 0.8;
/** reduce 모드에서 움직이지 않고 세워 둘 낮은 고정 높이(최대 길이 대비). */
const REDUCED_LEVEL = 0.16;

/**
 * 스펙트럼이 덮는 주파수 범위(Hz). 이 구간을 로그 간격으로 64칸으로 나눈다.
 *
 * 예전에는 FFT 빈을 그대로 로그 분할했는데, 빈 하나가 43Hz(fftSize 1024,
 * 44.1kHz)라 저음 쪽 칸 여러 개가 같은 빈을 보고 오른쪽은 한 칸이 수천 Hz를
 * 뭉뚱그렸다. 사람이 듣는 음높이 기준으로 40Hz~16kHz를 나눠야 폭 전체가
 * 고르게 움직인다. 저음 해상도를 위해 fftSize도 1024 → 4096으로 올렸다.
 */
const MIN_FREQ = 40;
const MAX_FREQ = 16000;

/** 자동 게인이 추적하는 선별 최근 최대값의 감쇠율과 하한. */
const PEAK_DECAY = 0.9985;
const MIN_PEAK = 0.02;
/**
 * 정규화할 때 최대값보다 조금 더 큰 값으로 나눈다. 1.0으로 나누면 최근
 * 최대치를 낼 때마다 천장에 붙어서 선이 한 덩어리로 꽉 차 보인다.
 */
const HEADROOM = 1.3;
/** 정규화한 값에 거는 지수. 클수록 큰 소리만 확 솟고 대비가 커진다. */
const SHAPE_EXPONENT = 1.8;

/**
 * 플레이 버튼을 바닥선 위에 얹기 위한 값들. **아래 두 값은 렌더링에 쓰는
 * Tailwind 클래스(버튼 `h-11`, 파형 SVG `h-10`)와 반드시 같아야 한다.**
 *
 * 원을 40px → 20px로 줄이면서 세로 가운데 정렬을 그대로 뒀더니 원이
 * 바닥선에서 8px쯤 떠 보였다. 큰 원일 때는 아래쪽이 바닥선까지 내려와
 * 닿아 있어서 드러나지 않던 문제다. 그래서 가운데 정렬 대신 원의 아래가
 * 바닥선에 닿도록 바닥에서 띄운다.
 */
const BUTTON_HEIGHT_PX = 44;
const WAVE_HEIGHT_PX = 40;
/** 바닥선이 버튼 아래 끝에서 몇 px 위에 있는지. */
const BASELINE_FROM_BOTTOM_PX =
  BUTTON_HEIGHT_PX -
  ((BUTTON_HEIGHT_PX - WAVE_HEIGHT_PX) / 2 +
    (WAVE_HEIGHT_PX * BASE_Y) / VIEW_HEIGHT);

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
 * 선 i의 기울기 가중치(0~1). 왼쪽이 1, 오른쪽으로 갈수록 0에 가까워진다.
 *
 * **이제 소리에는 쓰지 않는다.** 재생 중에는 자동 게인이 폭 전체를 고르게
 * 살리므로 여기를 곱하면 오른쪽이 다시 죽는다. 정지·reduce 모드에서 세워
 * 두는 고정 모양(왼쪽이 조금 높은 완만한 내리막)에만 쓴다.
 */
function tilt(index: number) {
  const t = index / (LINE_COUNT - 1);
  return 0.04 + 0.96 * Math.pow(1 - t, 1.7);
}

/**
 * 선 i에만 걸리는 고정 배율(0.9~1.1). 이웃한 선이 똑같이 움직여 매끈한
 * 곡선처럼 보이는 것을 막는다. 난수가 아니라 index로 정해지는 값이라
 * 매 프레임·매 렌더에 같은 결과가 나온다.
 */
function jitter(index: number) {
  const noise = Math.sin(index * 12.9898) * 43758.5453;
  return 0.9 + 0.2 * (noise - Math.floor(noise));
}

export default function BgmPlayer({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const linesRef = useRef<Array<SVGLineElement | null>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef<number | null>(null);
  /**
   * 선별 주파수 대역(40Hz~16kHz를 로그로 나눈 것)과 움직임 계수.
   * - `boost`: 고역으로 갈수록 원 신호가 약해 그대로 두면 오른쪽이 안 움직인다.
   * - `release`: 내려갈 때의 감쇠율. 선마다 달라야 한 덩어리로 움직이지 않는다.
   */
  const bandsRef = useRef<
    Array<{ from: number; to: number; boost: number; release: number }>
  >([]);
  const levelsRef = useRef<number[]>(new Array(LINE_COUNT).fill(0));
  /** 자동 게인용. 선마다 최근 최대값을 들고 천천히 떨어뜨린다. */
  const peaksRef = useRef<number[]>(new Array(LINE_COUNT).fill(MIN_PEAK));
  /** 루프를 걸지 말지 판단하는 값들. 이벤트 콜백이 state를 기다릴 수 없어 ref로 둔다. */
  const reducedRef = useRef(false);
  const visibleRef = useRef(true);
  const playingRef = useRef(false);
  const rootRef = useRef<HTMLButtonElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  /** 지금 몇 번째 곡인지. 처음 재생은 항상 0번(1번 곡)에서 시작한다. */
  const [trackIndex, setTrackIndex] = useState(0);
  /**
   * 곡이 끝나 다음 곡으로 넘어가는 중인지. `trackIndex`가 바뀐 뒤 effect가
   * 이 값을 보고 새 src를 이어서 재생한다. 사용자가 직접 고른 곡이 아니라
   * 자동 전환일 때만 true다.
   */
  const advancingRef = useRef(false);
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
   * level은 0~1이고 여기에 tilt를 곱하지 않는다 — 폭 전체가 고르게 움직여야
   * 하므로 가로 방향 감쇠는 걸지 않는다.
   */
  const drawLine = useCallback((index: number, level: number) => {
    const line = linesRef.current[index];
    if (!line) return;
    const length = IDLE_LENGTH + level * (MAX_LENGTH - IDLE_LENGTH);
    line.setAttribute("y1", (BASE_Y - length).toFixed(2));
  }, []);

  /** 정지·reduce에서 세워 두는 고정 모양. 이쪽만 tilt로 완만한 내리막을 준다. */
  const drawStatic = useCallback((level: number) => {
    for (let i = 0; i < LINE_COUNT; i += 1) {
      const line = linesRef.current[i];
      if (!line) continue;
      const length =
        (IDLE_LENGTH + level * (MAX_LENGTH - IDLE_LENGTH)) * tilt(i);
      line.setAttribute("y1", (BASE_Y - length).toFixed(2));
    }
  }, []);

  const resetLines = useCallback(() => {
    levelsRef.current.fill(0);
    peaksRef.current.fill(MIN_PEAK);
    drawStatic(0);
  }, [drawStatic]);

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
        // 고역 보정. 오른쪽 대역은 원 신호가 약해 보정 없이는 거의 안 선다.
        const raw = (average * 0.6 + (peak / 255) * 0.4) * band.boost;

        // 자동 게인 — 이 선이 최근에 낸 최대값을 기준으로 0~1로 정규화한다.
        // 최대값은 천천히 떨어지므로(PEAK_DECAY), 조용한 곡이든 큰 곡이든
        // 몇 초 안에 폭 전체가 제 높이를 찾는다. MIN_PEAK는 0으로 나누는
        // 것을 막는 하한이자, 완전한 무음에서 선이 치솟지 않게 하는 바닥이다.
        const decayed = peaksRef.current[i] * PEAK_DECAY;
        const nextPeak = raw > decayed ? raw : decayed;
        peaksRef.current[i] = nextPeak > MIN_PEAK ? nextPeak : MIN_PEAK;
        const normalized = Math.min(1, raw / (peaksRef.current[i] * HEADROOM));

        // 지수를 걸어 큰 소리는 확 솟고 작은 소리는 낮게 — 높낮이 대비를 키운다.
        const target = Math.min(1, Math.pow(normalized, SHAPE_EXPONENT) * jitter(i));

        // attack은 즉시, release는 선마다 조금씩 다른 속도로 천천히.
        const previous = levelsRef.current[i] * band.release;
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
      // 저음 쪽 해상도를 위해 크게 잡는다. 1024면 빈 하나가 43Hz라
      // 40~200Hz 구간의 칸 여러 개가 같은 빈을 보게 된다.
      analyser.fftSize = 4096;
      // 0.8은 너무 매끈해서 강약이 뭉개진다. 낮춰서 반응을 빠르게 한다.
      analyser.smoothingTimeConstant = 0.55;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      // **빈 번호가 아니라 주파수(Hz)를 로그로 나눈다.** 빈을 로그 분할하면
      // 실제 주파수 간격이 어긋나, 저음에 칸이 몰리고 오른쪽 한 칸이 수천
      // Hz를 뭉뚱그린다. 40Hz~16kHz를 64칸으로 나눠야 폭이 고르게 산다.
      const binCount = analyser.frequencyBinCount;
      const nyquist = ctx.sampleRate / 2;
      const toBin = (hz: number) =>
        Math.min(binCount - 1, Math.max(0, Math.round((hz / nyquist) * binCount)));
      const ratio = Math.pow(MAX_FREQ / MIN_FREQ, 1 / LINE_COUNT);

      bandsRef.current = Array.from({ length: LINE_COUNT }, (_, i) => {
        const from = toBin(MIN_FREQ * Math.pow(ratio, i));
        const to = Math.max(from + 1, toBin(MIN_FREQ * Math.pow(ratio, i + 1)));
        const t = i / (LINE_COUNT - 1);
        return {
          from,
          to,
          // 오른쪽으로 갈수록 크게 — 자동 게인이 자리 잡기 전에도 고역이 선다.
          boost: 1 + Math.pow(t, 1.3) * 5,
          // 선마다 다른 감쇠율(0.86~0.92). 한 덩어리로 내려오지 않게 한다.
          release: 0.86 + ((i * 7) % 5) * 0.015,
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
    drawStatic(REDUCED_LEVEL);
  }, [drawStatic, stopLoop]);

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

  /**
   * 곡이 끝나 `trackIndex`가 바뀐 뒤, 새로 걸린 src를 이어서 재생한다.
   * React가 커밋 단계에서 `<audio>`의 src를 이미 바꿔 놓은 뒤에 effect가
   * 돌기 때문에 여기서 play()를 부르면 새 곡이 나온다.
   *
   * **자동 게인은 곡이 바뀔 때 초기화한다.** 선별 최근 최대값은 천천히
   * 떨어지도록(PEAK_DECAY 0.9985) 해 뒀는데, 앞 곡이 크고 다음 곡이 작으면
   * 그 큰 기준이 한동안 남아 새 곡에서 선이 낮게 눌린다. 레벨(levelsRef)은
   * 건드리지 않아서 곡이 바뀌는 순간에도 파형이 끊기지 않는다.
   */
  useEffect(() => {
    if (!advancingRef.current) return;
    advancingRef.current = false;

    peaksRef.current.fill(MIN_PEAK);

    audioRef.current?.play()?.catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[BgmPlayer] 다음 곡 재생 실패:", err?.name, err?.message);
      }
    });
  }, [trackIndex]);

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

  /**
   * **곡이 끝나서 난 pause는 무시한다.** HTML 명세상 재생이 끝나면 `pause`가
   * 먼저 뜨고 그다음에 `ended`가 뜬다. 그대로 두면 곡이 넘어가는 순간마다
   * 아이콘이 ▶로 한 번 깜박이고 파형도 바닥으로 내려앉는다. 사용자가 직접
   * 멈춘 경우에만 정지 상태로 바꾼다.
   *
   * 판정은 `audio.ended`로 한다. 이 값은 재생 위치가 끝에 닿는 순간 참이
   * 되므로 `pause` 시점에 이미 참이다. 혹시 브라우저가 다르게 굴더라도
   * 남은 시간이 0.5초 이내면 끝난 것으로 본다.
   */
  function handlePause() {
    const audio = audioRef.current;
    if (audio) {
      const almostOver =
        Number.isFinite(audio.duration) && audio.duration - audio.currentTime < 0.5;
      if (audio.ended || almostOver) return;
    }
    setPlaying(false);
    playingRef.current = false;
    stopLoop();
    if (reducedRef.current) return;
    resetLines();
  }

  /** 곡이 끝나면 다음 곡으로. 마지막 곡 다음은 다시 1번이다(전체 반복). */
  function handleEnded() {
    advancingRef.current = true;
    setTrackIndex((index) => (index + 1) % PLAYLIST.length);
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
        className="h-10 w-48"
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

      {/*
        바닥선 가운데에 얹혀 있는 원형 컨트롤. **재생 중에도 사라지지 않고**
        안의 아이콘만 ▶ ↔ ❚❚로 바뀐다.

        아이콘을 가르는 `playing`은 클릭이 아니라 **오디오의 실제 상태**에서
        온다 — <audio>의 onPlay/onPause가 setPlaying을 부른다. 그래서 자동재생
        정책에 막혀 play()가 실패하면 ▶ 그대로 남고, 브라우저·OS가 밖에서
        음악을 멈춰도 표시가 따라간다.

        **보이는 원만 작고, 누르는 영역은 그대로다.** 이 <span>은
        `pointer-events-none`이라 클릭을 받지 않는다. 클릭은 전부 바깥
        <button>이 받고, 그 버튼은 높이 h-11(44px) · 너비 w-48(192px)로
        이퀄라이저 전체를 덮는다.

        배경을 반투명(bg-white/90)에서 불투명으로 올렸다. 재생 중에는 뒤로
        세로선이 계속 지나가는데, 비쳐 보이면 아이콘과 겹쳐 지저분하다.
      */}
      <span
        className="pointer-events-none absolute left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-[0_0_6px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/60"
        style={{ bottom: `${BASELINE_FROM_BOTTOM_PX}px` }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2 w-2 fill-cyan-700">
            <path d="M8 5h2.6v14H8zM13.4 5H16v14h-2.6z" />
          </svg>
        ) : (
          // 삼각형은 시각적 무게중심이 왼쪽에 쏠려서, 원 정가운데에 두면
          // 왼쪽으로 치우쳐 보인다. 크기에 맞춰 0.5px만 오른쪽으로 민다.
          // ❚❚는 좌우 대칭이라 이 보정이 필요 없다.
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-[0.5px] h-2 w-2 fill-cyan-700">
            <path d="M8 4.5 19 12 8 19.5Z" />
          </svg>
        )}
      </span>

      {/* 요소는 하나뿐이고 src만 바뀐다. `loop`를 쓰지 않는 이유는 한 곡을
          무한 반복하면 `ended`가 오지 않아 다음 곡으로 넘어갈 수 없어서다 —
          전체 반복은 handleEnded가 인덱스를 돌려 만든다. `preload="none"`이라
          지금 곡만 받고 나머지 7곡은 건드리지 않는다. */}
      <audio
        ref={audioRef}
        src={PLAYLIST[trackIndex].src}
        preload="none"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    </button>
  );
}
