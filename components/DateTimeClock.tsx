"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "2026.09.04 (금)" */
function formatDate(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${
    WEEKDAYS[d.getDay()]
  })`;
}

/** "20:15:20" (24시간제) */
function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 서버 렌더링 시점에는 시간을 알 수 없으므로, 마운트 전에는 아무것도
 * 그리지 않아 서버-클라이언트 hydration mismatch를 피한다.
 */
export default function DateTimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
      />
      <span className="whitespace-nowrap">{formatDate(now)}</span>
      <span className="whitespace-nowrap font-bold text-slate-900">
        {formatTime(now)}
      </span>
      <span aria-hidden="true">·</span>
      {/* 실제로 실시간 진료 가능 여부를 반영하는 기능은 없다. Claude Design
          시안의 문구를 그대로 가져온 것이라 오해 소지가 있다 — 나중에 실제
          기능을 붙이거나, 그 전까지는 문구를 바꿔야 한다. */}
      <span className="whitespace-nowrap text-slate-400">
        실시간 진료 가능 여부 반영
      </span>
    </p>
  );
}
